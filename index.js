(() => {
    'use strict';
  
    /* ── STATE ─── */
    const state = {
      title: 'Redesign the authentication system',
      description: `We need to redesign the authentication system to support multi-factor
  authentication and improve security. This includes updating the login
  flow, adding support for TOTP apps, and ensuring compliance with
  security standards. Additionally, we must audit existing sessions,
  implement rate-limiting on login attempts, and roll out a password
  strength policy across all user tiers.`,
      priority: 'Medium',
      status: 'In Progress',
      dueDate: new Date('2026-04-16T18:00:00Z'),
      isExpanded: false,
    };
  
    // Snapshot for cancel
    let editSnapshot = null;
  
    /* ── ELEMENT REFS ─── */
    const wrapper        = document.getElementById('card-wrapper');
    const checkbox       = document.querySelector('[data-testid="test-todo-complete-toggle"]');
    const titleEl        = document.querySelector('[data-testid="test-todo-title"]');
    const descEl         = document.querySelector('[data-testid="test-todo-description"]');
    const priorityBadge  = document.querySelector('[data-testid="test-todo-priority"]');
    const statusBadge    = document.querySelector('[data-testid="test-todo-status"]');
    const statusControl  = document.querySelector('[data-testid="test-todo-status-control"]');
    const timeEl         = document.getElementById('time-remaining');
    const overdueEl      = document.getElementById('overdue-indicator');
    const expandToggle   = document.querySelector('[data-testid="test-todo-expand-toggle"]');
    const collapsible    = document.querySelector('[data-testid="test-todo-collapsible-section"]');
    const editForm       = document.querySelector('[data-testid="test-todo-edit-form"]');
    const actionButtons  = document.getElementById('action-buttons');
    const editBtn        = document.getElementById('edit-btn');
    const saveBtn        = document.getElementById('save-btn');
    const cancelBtn      = document.getElementById('cancel-btn');
    const priorityIndicator = document.querySelector('[data-testid="test-todo-priority-indicator"]');
  
    // Edit form inputs
    const editTitle    = document.querySelector('[data-testid="test-todo-edit-title-input"]');
    const editDesc     = document.querySelector('[data-testid="test-todo-edit-description-input"]');
    const editPriority = document.querySelector('[data-testid="test-todo-edit-priority-select"]');
    const editDueDate  = document.querySelector('[data-testid="test-todo-edit-due-date-input"]');
  
    /* ── TIME LOGIC ─── */
    function getTimeText() {
      if (state.status === 'Done') return 'Completed';
  
      const now  = Date.now();
      const diff = state.dueDate.getTime() - now;
      const abs  = Math.abs(diff);
      const mins = Math.floor(abs / 60000);
      const hrs  = Math.floor(abs / 3600000);
      const days = Math.floor(abs / 86400000);
  
      if (diff < 0) {
        timeEl.className = 'overdue';
        if (hrs < 1)  return `Overdue by ${mins} minute${mins !== 1 ? 's' : ''}`;
        if (hrs < 24) return `Overdue by ${hrs} hour${hrs !== 1 ? 's' : ''}`;
        return `Overdue by ${days} day${days !== 1 ? 's' : ''}`;
      }
      if (mins < 2)  { timeEl.className = 'overdue'; return 'Due now!'; }
      if (mins < 60) { timeEl.className = 'soon';    return `Due in ${mins} minute${mins !== 1 ? 's' : ''}`; }
      if (hrs < 24)  { timeEl.className = 'soon';    return hrs < 2 ? `Due in ${hrs} hour` : `Due today in ${hrs}h`; }
      if (days === 1){ timeEl.className = 'soon';    return 'Due tomorrow'; }
      timeEl.className = 'ok';
      return `Due in ${days} days`;
    }
  
    function updateTime() {
      if (state.status === 'Done') {
        timeEl.textContent = 'Completed';
        timeEl.className = 'done-time';
        overdueEl.classList.add('hidden');
        wrapper.classList.remove('overdue-card');
        return;
      }
  
      const now = Date.now();
      const isOverdue = state.dueDate.getTime() < now;
  
      timeEl.textContent = getTimeText();
  
      if (isOverdue) {
        overdueEl.classList.remove('hidden');
        wrapper.classList.add('overdue-card');
      } else {
        overdueEl.classList.add('hidden');
        wrapper.classList.remove('overdue-card');
      }
    }
  
    /* ── PRIORITY RENDERING ─── */
    const PRIORITY_MAP = {
      Low:    { label: '🟢 Low',    cls: 'low',    wrapperCls: 'priority-low' },
      Medium: { label: '⚡ Medium', cls: 'medium', wrapperCls: 'priority-medium' },
      High:   { label: '🔴 High',  cls: 'high',   wrapperCls: 'priority-high' },
    };
  
    function renderPriority() {
      const p = PRIORITY_MAP[state.priority] || PRIORITY_MAP.Medium;
      priorityBadge.textContent = p.label;
      priorityBadge.className = `badge ${p.cls}`;
      priorityBadge.setAttribute('aria-label', `Priority: ${state.priority}`);
  
      // Update wrapper class
      wrapper.classList.remove('priority-low', 'priority-medium', 'priority-high');
      wrapper.classList.add(p.wrapperCls);
    }
  
    /* ── STATUS RENDERING ─── */
    const STATUS_MAP = {
      Pending:       { label: '⏳ Pending',     selectCls: 'pending-status', badgeText: '⏳ Pending' },
      'In Progress': { label: '🔵 In Progress', selectCls: '',               badgeText: '🔵 In Progress' },
      Done:          { label: '✅ Done',         selectCls: 'done-status',   badgeText: '✅ Done' },
    };
  
    function renderStatus() {
      const s = STATUS_MAP[state.status] || STATUS_MAP['In Progress'];
      const isDone = state.status === 'Done';
  
      // Badge
      statusBadge.textContent = s.badgeText;
      statusBadge.setAttribute('aria-label', `Status: ${state.status}`);
  
      // Select colour
      statusControl.className = `status-select ${s.selectCls}`;
      statusControl.value = state.status;
  
      // Checkbox sync
      checkbox.checked = isDone;
  
      // Wrapper class
      wrapper.classList.toggle('done', isDone);
      wrapper.classList.remove('in-progress', 'pending');
      if (state.status === 'In Progress') wrapper.classList.add('in-progress');
      if (state.status === 'Pending') wrapper.classList.add('pending');
  
      updateTime();
    }
  
    /* ── EXPAND / COLLAPSE ─── */
    const COLLAPSE_THRESHOLD = 120; // chars
  
    function initExpandCollapse() {
      const isLong = state.description.length > COLLAPSE_THRESHOLD;
      if (!isLong) {
        expandToggle.style.display = 'none';
        descEl.classList.remove('collapsed');
        return;
      }
      expandToggle.style.display = '';
      updateExpandUI();
    }
  
    function updateExpandUI() {
      if (state.isExpanded) {
        descEl.classList.remove('collapsed');
        descEl.classList.add('expanded');
        collapsible.classList.add('open');
        collapsible.setAttribute('aria-hidden', 'false');
        expandToggle.setAttribute('aria-expanded', 'true');
        expandToggle.querySelector('.expand-label').textContent = 'Show less';
      } else {
        descEl.classList.add('collapsed');
        descEl.classList.remove('expanded');
        collapsible.classList.remove('open');
        collapsible.setAttribute('aria-hidden', 'true');
        expandToggle.setAttribute('aria-expanded', 'false');
        expandToggle.querySelector('.expand-label').textContent = 'Show more';
      }
    }
  
    expandToggle.addEventListener('click', () => {
      state.isExpanded = !state.isExpanded;
      updateExpandUI();
    });
  
    /* ── EDIT MODE ─── */
    function openEditMode() {
      // Take snapshot
      editSnapshot = { ...state };
  
      // Populate form
      editTitle.value    = state.title;
      editDesc.value     = state.description;
      editPriority.value = state.priority;
  
      const d = state.dueDate;
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      editDueDate.value  = `${yyyy}-${mm}-${dd}`;
  
      // Show form, hide action buttons
      editForm.classList.remove('hidden');
      actionButtons.style.display = 'none';
  
      // Focus first field
      editTitle.focus();
    }
  
    function closeEditMode(save) {
      if (save) {
        // Apply edits
        state.title       = editTitle.value.trim() || state.title;
        state.description = editDesc.value.trim()  || state.description;
        state.priority    = editPriority.value;
        if (editDueDate.value) {
          state.dueDate = new Date(editDueDate.value + 'T18:00:00Z');
        }
  
        // Re-render
        titleEl.textContent = state.title;
        descEl.textContent  = state.description;
        renderPriority();
        initExpandCollapse();
        updateTime();
      } else {
        // Restore snapshot (state object untouched already; snapshot was a copy)
        Object.assign(state, editSnapshot);
      }
  
      editForm.classList.add('hidden');
      actionButtons.style.display = '';
      editBtn.focus(); // Return focus to Edit button
    }
  
    editBtn.addEventListener('click', openEditMode);
    saveBtn.addEventListener('click', () => closeEditMode(true));
    cancelBtn.addEventListener('click', () => closeEditMode(false));
  
    // Keyboard: Escape closes edit
    editForm.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeEditMode(false);
    });
  
    /* ── STATUS CONTROL (dropdown) ─── */
    statusControl.addEventListener('change', () => {
      state.status = statusControl.value;
      renderStatus();
    });
  
    /* ── CHECKBOX ─── */
    checkbox.addEventListener('change', () => {
      state.status = checkbox.checked ? 'Done' : 'Pending';
      renderStatus();
    });
  
    /* ── INIT ─── */
    renderPriority();
    renderStatus();
    initExpandCollapse();
    updateTime();
  
    // Tick every 30 seconds
    setInterval(updateTime, 30000);
  
  })();