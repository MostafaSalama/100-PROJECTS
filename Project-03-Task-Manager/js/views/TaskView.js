/**
 * TaskView.js - Task View Management
 * 
 * Handles UI rendering and user interactions for tasks.
 * Manages different view modes (card, list, kanban) and task display.
 */

export class TaskView {
    constructor(taskController, filterController) {
        this.taskController = taskController;
        this.filterController = filterController;
        
        // DOM elements
        this.elements = this.initializeElements();
        
        // View state
        this.currentView = 'card';
        this.selectedTasks = new Set();
        this.isSelectAllMode = false;
        
        // Task templates
        this.taskTemplates = this.initializeTemplates();
        
        this.initialize();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        return {
            // Containers
            taskContainer: document.getElementById('taskContainer'),
            emptyState: document.getElementById('emptyState'),
            loadingState: document.getElementById('loadingState'),
            
            // Header elements
            currentViewTitle: document.getElementById('currentViewTitle'),
            taskCount: document.getElementById('taskCount'),
            
            // View controls
            cardViewBtn: document.getElementById('cardViewBtn'),
            listViewBtn: document.getElementById('listViewBtn'),
            kanbanViewBtn: document.getElementById('kanbanViewBtn'),
            
            // Actions
            selectAllBtn: document.getElementById('selectAllBtn'),
            bulkActionsBtn: document.getElementById('bulkActionsBtn'),
            addTaskBtn: document.getElementById('addTaskBtn'),
            createFirstTaskBtn: document.getElementById('createFirstTaskBtn'),
            
            // Pagination
            pagination: document.getElementById('pagination'),
            currentPage: document.getElementById('currentPage'),
            totalPages: document.getElementById('totalPages'),
            prevPageBtn: document.getElementById('prevPageBtn'),
            nextPageBtn: document.getElementById('nextPageBtn'),
            
            // Modals
            taskModal: document.getElementById('taskModal'),
            bulkActionsModal: document.getElementById('bulkActionsModal')
        };
    }

    /**
     * Initialize task templates
     */
    initializeTemplates() {
        return {
            taskCard: this.createTaskCardTemplate(),
            taskListItem: this.createTaskListTemplate(),
            kanbanCard: this.createKanbanCardTemplate()
        };
    }

    /**
     * Initialize task view
     */
    initialize() {
        this.setupEventListeners();
        this.setupViewControls();
        this.initializeModals();
        
        // Show loading initially
        this.showLoadingState();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Controller events
        window.addEventListener('taskController:tasksLoaded', this.handleTasksLoaded.bind(this));
        window.addEventListener('taskController:statisticsUpdated', this.handleStatisticsUpdated.bind(this));
        window.addEventListener('taskController:viewChanged', this.handleViewChanged.bind(this));
        window.addEventListener('taskController:selectionChanged', this.handleSelectionChanged.bind(this));
        
        // Filter events
        window.addEventListener('filterController:filtersApplied', this.handleFiltersApplied.bind(this));
        window.addEventListener('filterController:filterUIUpdate', this.handleFilterUIUpdate.bind(this));
        
        // View mode buttons
        this.elements.cardViewBtn?.addEventListener('click', () => this.changeView('card'));
        this.elements.listViewBtn?.addEventListener('click', () => this.changeView('list'));
        this.elements.kanbanViewBtn?.addEventListener('click', () => this.changeView('kanban'));
        
        // Action buttons
        this.elements.selectAllBtn?.addEventListener('click', this.handleSelectAllClick.bind(this));
        this.elements.bulkActionsBtn?.addEventListener('click', this.showBulkActionsModal.bind(this));
        this.elements.addTaskBtn?.addEventListener('click', () => this.showTaskForm());
        this.elements.createFirstTaskBtn?.addEventListener('click', () => this.showTaskForm());
        
        // Pagination
        this.elements.prevPageBtn?.addEventListener('click', this.handlePrevPage.bind(this));
        this.elements.nextPageBtn?.addEventListener('click', this.handleNextPage.bind(this));
    }

    /**
     * Handle tasks loaded event
     * @param {Object} event - Event data
     */
    handleTasksLoaded(event) {
        const { tasks, totalTasks, totalPages, currentPage, view } = event.detail;
        
        this.hideLoadingState();
        
        if (tasks.length === 0) {
            this.showEmptyState();
        } else {
            this.hideEmptyState();
            this.renderTasks(tasks, view);
        }
        
        this.updateTaskCount(totalTasks);
        this.updatePagination(currentPage, totalPages, totalTasks);
    }

    /**
     * Render tasks based on current view
     * @param {Array} tasks - Tasks to render
     * @param {string} viewMode - View mode
     */
    renderTasks(tasks, viewMode = this.currentView) {
        if (!this.elements.taskContainer) return;
        
        // Clear container
        this.elements.taskContainer.innerHTML = '';
        this.elements.taskContainer.className = `task-container task-${viewMode}-view`;
        
        if (viewMode === 'kanban') {
            this.renderKanbanView(tasks);
        } else {
            tasks.forEach((task, index) => {
                const taskElement = this.createTaskElement(task, viewMode);
                this.elements.taskContainer.appendChild(taskElement);
                
                // Stagger animation
                setTimeout(() => {
                    taskElement.classList.add('task-card-enter-active');
                }, index * 50);
            });
        }
    }

    /**
     * Create task element based on view mode
     * @param {Object} task - Task object
     * @param {string} viewMode - View mode
     * @returns {HTMLElement} Task element
     */
    createTaskElement(task, viewMode) {
        const template = viewMode === 'list' ? this.taskTemplates.taskListItem : this.taskTemplates.taskCard;
        const element = this.createElement(template(task));
        
        // Add event listeners
        this.attachTaskEventListeners(element, task);
        
        return element;
    }

    /**
     * Create task card template
     */
    createTaskCardTemplate() {
        return (task) => {
            const displayProps = task.getDisplayProperties();
            const isSelected = this.selectedTasks.has(task.id);
            const isOverdue = task.isOverdue();
            const dueDate = task.dueDate ? new Date(task.dueDate) : null;
            
            return `
                <div class="task-card ${task.status} ${task.priority}-priority ${isSelected ? 'selected' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-task-id="${task.id}" data-task-type="${task.type}">
                    
                    <div class="task-card-header">
                        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                             data-action="toggle-complete"></div>
                        
                        <div class="task-main-content">
                            <h3 class="task-title">${this.escapeHtml(task.title)}</h3>
                            ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                            
                            <div class="task-type-badge">
                                <span class="task-type-icon">${displayProps.icon}</span>
                                ${task.type}
                            </div>
                        </div>
                        
                        <div class="task-actions">
                            <button class="task-action-btn" data-action="edit" title="Edit Task">
                                <span class="icon">✏️</span>
                            </button>
                            <button class="task-action-btn" data-action="duplicate" title="Duplicate Task">
                                <span class="icon">📋</span>
                            </button>
                            <button class="task-action-btn" data-action="delete" title="Delete Task">
                                <span class="icon">🗑️</span>
                            </button>
                        </div>
                    </div>
                    
                    ${this.renderTaskProgress(task)}
                    ${this.renderTaskTags(task)}
                    ${this.renderTaskMetadata(task, dueDate)}
                </div>
            `;
        };
    }

    /**
     * Create task list template
     */
    createTaskListTemplate() {
        return (task) => {
            const displayProps = task.getDisplayProperties();
            const isSelected = this.selectedTasks.has(task.id);
            const isOverdue = task.isOverdue();
            
            return `
                <div class="task-card ${task.status} ${task.priority}-priority ${isSelected ? 'selected' : ''} ${isOverdue ? 'overdue' : ''}" 
                     data-task-id="${task.id}" data-task-type="${task.type}">
                    
                    <div class="task-card-header">
                        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
                             data-action="toggle-complete"></div>
                        
                        <div class="task-main-content">
                            <div class="task-title">${this.escapeHtml(task.title)}</div>
                            <div class="task-type-badge">
                                <span class="task-type-icon">${displayProps.icon}</span>
                                ${task.type}
                            </div>
                        </div>
                        
                        ${this.renderTaskProgress(task, true)}
                        ${this.renderTaskTags(task, true)}
                        
                        <div class="task-metadata">
                            <div class="task-meta-right">
                                ${task.dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">${this.formatDate(task.dueDate)}</span>` : ''}
                            </div>
                        </div>
                        
                        <div class="task-actions">
                            <button class="task-action-btn" data-action="edit" title="Edit">✏️</button>
                            <button class="task-action-btn" data-action="delete" title="Delete">🗑️</button>
                        </div>
                    </div>
                </div>
            `;
        };
    }

    /**
     * Create kanban card template
     */
    createKanbanCardTemplate() {
        return (task) => {
            const displayProps = task.getDisplayProperties();
            
            return `
                <div class="task-card compact" data-task-id="${task.id}" data-task-type="${task.type}"
                     draggable="true">
                    
                    <div class="task-card-header">
                        <div class="task-main-content">
                            <h4 class="task-title">${this.escapeHtml(task.title)}</h4>
                            ${task.description ? `<p class="task-description">${this.escapeHtml(task.description)}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="task-type-badge">
                        <span class="task-type-icon">${displayProps.icon}</span>
                        ${task.type}
                    </div>
                    
                    ${this.renderTaskProgress(task, true)}
                    ${this.renderTaskTags(task, true)}
                    
                    <div class="task-metadata">
                        ${task.dueDate ? `<span class="task-due-date">${this.formatDate(task.dueDate)}</span>` : ''}
                        <span class="task-priority ${task.priority}-priority">${task.priority}</span>
                    </div>
                </div>
            `;
        };
    }

    /**
     * Render task progress
     * @param {Object} task - Task object
     * @param {boolean} compact - Compact mode
     * @returns {string} Progress HTML
     */
    renderTaskProgress(task, compact = false) {
        if (task.progress === 0 && !compact) return '';
        
        return `
            <div class="task-progress">
                ${!compact ? `
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-percentage">${task.progress}%</span>
                    </div>
                ` : ''}
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${task.progress}%"></div>
                </div>
            </div>
        `;
    }

    /**
     * Render task tags
     * @param {Object} task - Task object
     * @param {boolean} compact - Compact mode
     * @returns {string} Tags HTML
     */
    renderTaskTags(task, compact = false) {
        if (!task.tags || task.tags.length === 0) return '';
        
        const maxTags = compact ? 3 : 5;
        const visibleTags = task.tags.slice(0, maxTags);
        const hiddenCount = task.tags.length - maxTags;
        
        return `
            <div class="task-tags">
                ${visibleTags.map(tag => `<span class="task-tag">${this.escapeHtml(tag)}</span>`).join('')}
                ${hiddenCount > 0 ? `<span class="task-tag">+${hiddenCount}</span>` : ''}
            </div>
        `;
    }

    /**
     * Render task metadata
     * @param {Object} task - Task object
     * @param {Date} dueDate - Due date object
     * @returns {string} Metadata HTML
     */
    renderTaskMetadata(task, dueDate) {
        const isOverdue = task.isOverdue();
        const isDueToday = task.isDueToday();
        
        return `
            <div class="task-metadata">
                <div class="task-meta-left">
                    ${dueDate ? `
                        <span class="task-due-date ${isOverdue ? 'overdue' : isDueToday ? 'due-today' : ''}">
                            📅 ${this.formatDate(dueDate)}
                        </span>
                    ` : ''}
                </div>
                <div class="task-meta-right">
                    <span class="task-created-date">
                        🕒 ${this.formatRelativeDate(task.createdAt)}
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Render kanban view
     * @param {Array} tasks - Tasks to render
     */
    renderKanbanView(tasks) {
        const columns = {
            'pending': { title: 'To Do', tasks: [] },
            'in-progress': { title: 'In Progress', tasks: [] },
            'completed': { title: 'Completed', tasks: [] },
            'cancelled': { title: 'Cancelled', tasks: [] }
        };
        
        // Group tasks by status
        tasks.forEach(task => {
            if (columns[task.status]) {
                columns[task.status].tasks.push(task);
            }
        });
        
        // Create kanban columns
        const kanbanHtml = Object.entries(columns).map(([status, column]) => `
            <div class="kanban-column" data-status="${status}">
                <div class="kanban-header">
                    <h3>${column.title}</h3>
                    <span class="task-count">${column.tasks.length}</span>
                </div>
                <div class="kanban-tasks">
                    ${column.tasks.map(task => this.taskTemplates.kanbanCard(task)).join('')}
                </div>
            </div>
        `).join('');
        
        this.elements.taskContainer.innerHTML = `<div class="kanban-board">${kanbanHtml}</div>`;
        
        // Setup drag and drop
        this.setupKanbanDragDrop();
    }

    /**
     * Setup kanban drag and drop
     */
    setupKanbanDragDrop() {
        const cards = this.elements.taskContainer.querySelectorAll('.task-card[draggable="true"]');
        const columns = this.elements.taskContainer.querySelectorAll('.kanban-tasks');
        
        cards.forEach(card => {
            card.addEventListener('dragstart', this.handleDragStart.bind(this));
            card.addEventListener('dragend', this.handleDragEnd.bind(this));
        });
        
        columns.forEach(column => {
            column.addEventListener('dragover', this.handleDragOver.bind(this));
            column.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    /**
     * Attach event listeners to task element
     * @param {HTMLElement} element - Task element
     * @param {Object} task - Task object
     */
    attachTaskEventListeners(element, task) {
        // Task selection
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.task-actions') && !e.target.closest('.task-checkbox')) {
                this.toggleTaskSelection(task.id);
            }
        });
        
        // Action buttons
        const actionBtns = element.querySelectorAll('[data-action]');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.getAttribute('data-action');
                this.handleTaskAction(action, task);
            });
        });
        
        // Checkbox
        const checkbox = element.querySelector('.task-checkbox');
        if (checkbox) {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTaskAction('toggle-complete', task);
            });
        }
    }

    /**
     * Handle task action
     * @param {string} action - Action type
     * @param {Object} task - Task object
     */
    handleTaskAction(action, task) {
        switch (action) {
            case 'toggle-complete':
                this.emit('taskComplete', { taskId: task.id });
                break;
            case 'edit':
                this.emit('taskEdit', { taskId: task.id });
                break;
            case 'delete':
                this.emit('taskDelete', { taskId: task.id });
                break;
            case 'duplicate':
                this.emit('taskDuplicate', { taskId: task.id });
                break;
        }
    }

    /**
     * Show task form modal
     * @param {Object} task - Task to edit (optional)
     */
    showTaskForm(task = null) {
        if (this.elements.taskModal) {
            this.elements.taskModal.style.display = 'flex';
            this.elements.taskModal.classList.add('active');
            
            if (task) {
                // Populate form with task data
                this.populateTaskForm(task);
            }
        }
    }

    /**
     * Hide task form modal
     */
    hideTaskForm() {
        if (this.elements.taskModal) {
            this.elements.taskModal.classList.remove('active');
            setTimeout(() => {
                this.elements.taskModal.style.display = 'none';
                this.clearTaskForm(); // Clear form when hiding
            }, 300);
        }
    }

    /**
     * Populate task form with existing task data
     * @param {Object} task - Task to edit
     */
    populateTaskForm(task) {
        const form = document.getElementById('taskForm');
        if (!form || !task) return;

        try {
            // Set form as edit mode
            form.setAttribute('data-task-id', task.id);
            
            // Update form title
            const modalTitle = document.querySelector('#taskModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Edit Task';
            }

            // Populate basic fields
            this.setFieldValue('taskTitle', task.title);
            this.setFieldValue('taskDescription', task.description);
            this.setFieldValue('taskType', task.type);
            this.setFieldValue('taskPriority', task.priority);
            this.setFieldValue('taskProgress', task.progress);
            this.setFieldValue('taskEstimate', task.estimatedMinutes);
            this.setFieldValue('taskNotes', task.notes);

            // Handle due date
            if (task.dueDate) {
                const dueDate = new Date(task.dueDate);
                if (!isNaN(dueDate.getTime())) {
                    const dateStr = dueDate.toISOString().split('T')[0];
                    const timeStr = dueDate.toTimeString().substring(0, 5);
                    this.setFieldValue('taskDueDate', dateStr);
                    this.setFieldValue('taskDueTime', timeStr);
                }
            }

            // Handle tags
            if (task.tags && Array.isArray(task.tags)) {
                this.setFieldValue('taskTags', task.tags.join(', '));
            }

            // Update progress display
            this.updateProgressDisplay(task.progress);

            // Update save button text
            const saveButton = document.getElementById('saveTaskBtn');
            if (saveButton) {
                saveButton.textContent = 'Update Task';
            }

        } catch (error) {
            console.error('Error populating task form:', error);
        }
    }

    /**
     * Clear task form
     */
    clearTaskForm() {
        const form = document.getElementById('taskForm');
        if (!form) return;

        try {
            // Remove edit mode
            form.removeAttribute('data-task-id');
            
            // Reset form title
            const modalTitle = document.querySelector('#taskModal .modal-title');
            if (modalTitle) {
                modalTitle.textContent = 'Create New Task';
            }

            // Reset form
            form.reset();

            // Reset specific values
            this.setFieldValue('taskType', 'work');
            this.setFieldValue('taskPriority', 'medium');
            this.setFieldValue('taskProgress', 0);
            
            // Update progress display
            this.updateProgressDisplay(0);

            // Update save button text
            const saveButton = document.getElementById('saveTaskBtn');
            if (saveButton) {
                saveButton.textContent = 'Save Task';
            }

        } catch (error) {
            console.error('Error clearing task form:', error);
        }
    }

    /**
     * Set form field value safely
     * @param {string} fieldId - Field ID
     * @param {any} value - Value to set
     */
    setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field || value === undefined || value === null) return;

        try {
            if (field.type === 'checkbox') {
                field.checked = Boolean(value);
            } else if (field.type === 'range') {
                field.value = value;
                // Trigger input event to update any displays
                field.dispatchEvent(new Event('input'));
            } else {
                field.value = value;
            }
        } catch (error) {
            console.warn(`Error setting field ${fieldId}:`, error);
        }
    }

    /**
     * Update progress display
     * @param {number} progress - Progress value
     */
    updateProgressDisplay(progress) {
        const progressOutput = document.getElementById('progressValue');
        if (progressOutput) {
            progressOutput.textContent = `${progress}%`;
        }
    }

    /**
     * Show bulk actions modal
     */
    showBulkActionsModal() {
        if (this.selectedTasks.size === 0) {
            this.taskController.notificationService.warning('No tasks selected');
            return;
        }
        
        if (this.elements.bulkActionsModal) {
            this.elements.bulkActionsModal.style.display = 'flex';
            this.elements.bulkActionsModal.classList.add('active');
        }
    }

    /**
     * Change view mode
     * @param {string} viewMode - New view mode
     */
    changeView(viewMode) {
        this.currentView = viewMode;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${viewMode}ViewBtn`)?.classList.add('active');
        
        // Emit view change event
        this.emit('viewChange', { view: viewMode });
    }

    /**
     * Toggle task selection
     * @param {string} taskId - Task ID
     */
    toggleTaskSelection(taskId) {
        const isSelected = this.selectedTasks.has(taskId);
        
        if (isSelected) {
            this.selectedTasks.delete(taskId);
        } else {
            this.selectedTasks.add(taskId);
        }
        
        // Update UI
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.toggle('selected', !isSelected);
        }
        
        // Emit selection change
        this.emit('taskSelect', { taskId, selected: !isSelected });
    }

    /**
     * Update task count display
     * @param {number} count - Task count
     */
    updateTaskCount(count) {
        if (this.elements.taskCount) {
            this.elements.taskCount.textContent = `${count} task${count !== 1 ? 's' : ''}`;
        }
    }

    /**
     * Update pagination
     * @param {number} currentPage - Current page
     * @param {number} totalPages - Total pages
     * @param {number} totalTasks - Total tasks
     */
    updatePagination(currentPage, totalPages, totalTasks) {
        if (!this.elements.pagination) return;
        
        if (totalPages <= 1) {
            this.elements.pagination.style.display = 'none';
            return;
        }
        
        this.elements.pagination.style.display = 'flex';
        
        if (this.elements.currentPage) {
            this.elements.currentPage.textContent = currentPage;
        }
        
        if (this.elements.totalPages) {
            this.elements.totalPages.textContent = totalPages;
        }
        
        // Update button states
        if (this.elements.prevPageBtn) {
            this.elements.prevPageBtn.disabled = currentPage <= 1;
        }
        
        if (this.elements.nextPageBtn) {
            this.elements.nextPageBtn.disabled = currentPage >= totalPages;
        }
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'flex';
        }
        if (this.elements.taskContainer) {
            this.elements.taskContainer.style.display = 'none';
        }
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = 'none';
        }
        if (this.elements.taskContainer) {
            this.elements.taskContainer.style.display = 'block';
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'flex';
        }
        if (this.elements.taskContainer) {
            this.elements.taskContainer.style.display = 'none';
        }
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        if (this.elements.emptyState) {
            this.elements.emptyState.style.display = 'none';
        }
        if (this.elements.taskContainer) {
            this.elements.taskContainer.style.display = 'block';
        }
    }

    // ===== EVENT HANDLERS =====

    handleViewChanged(event) {
        const { view } = event.detail;
        this.currentView = view;
    }

    handleSelectionChanged(event) {
        const { selectedCount } = event.detail;
        
        // Update bulk actions button
        if (this.elements.bulkActionsBtn) {
            this.elements.bulkActionsBtn.disabled = selectedCount === 0;
            this.elements.bulkActionsBtn.textContent = selectedCount > 0 ? 
                `Bulk Actions (${selectedCount})` : 'Bulk Actions';
        }
    }

    handleSelectAllClick() {
        this.emit('selectAll');
    }

    handlePrevPage() {
        this.emit('pageChange', { direction: 'prev' });
    }

    handleNextPage() {
        this.emit('pageChange', { direction: 'next' });
    }

    handleFiltersApplied(event) {
        const { resultsCount } = event.detail;
        this.updateTaskCount(resultsCount);
    }

    handleStatisticsUpdated(event) {
        // Handle statistics update if needed
    }

    handleFilterUIUpdate(event) {
        // Handle filter UI updates if needed
    }

    // ===== DRAG AND DROP HANDLERS =====

    handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.getAttribute('data-task-id'));
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
    }

    handleDrop(e) {
        e.preventDefault();
        
        const taskId = e.dataTransfer.getData('text/plain');
        const column = e.target.closest('.kanban-column');
        const newStatus = column?.getAttribute('data-status');
        
        if (taskId && newStatus) {
            // Update task status
            this.taskController.updateTask(taskId, { status: newStatus });
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Create DOM element from HTML string
     * @param {string} html - HTML string
     * @returns {HTMLElement} DOM element
     */
    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }

    /**
     * Escape HTML for safe insertion
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    /**
     * Format relative date
     * @param {Date|string} date - Date to format
     * @returns {string} Relative date
     */
    formatRelativeDate(date) {
        const now = new Date();
        const d = new Date(date);
        const diffTime = Math.abs(now - d);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        return d.toLocaleDateString();
    }

    /**
     * Setup view controls
     */
    setupViewControls() {
        // Initialize with card view active
        this.elements.cardViewBtn?.classList.add('active');
    }

    /**
     * Setup modal handlers
     */
    initializeModals() {
        // Task modal close handlers
        if (this.elements.taskModal) {
            const closeBtn = this.elements.taskModal.querySelector('.modal-close');
            const backdrop = this.elements.taskModal.querySelector('.modal-backdrop');
            
            closeBtn?.addEventListener('click', () => this.hideTaskForm());
            backdrop?.addEventListener('click', () => this.hideTaskForm());
        }
        
        // Bulk actions modal close handlers
        if (this.elements.bulkActionsModal) {
            const closeBtn = this.elements.bulkActionsModal.querySelector('.modal-close');
            const backdrop = this.elements.bulkActionsModal.querySelector('.modal-backdrop');
            
            closeBtn?.addEventListener('click', () => this.hideBulkActionsModal());
            backdrop?.addEventListener('click', () => this.hideBulkActionsModal());
        }
    }

    /**
     * Hide bulk actions modal
     */
    hideBulkActionsModal() {
        if (this.elements.bulkActionsModal) {
            this.elements.bulkActionsModal.classList.remove('active');
            setTimeout(() => {
                this.elements.bulkActionsModal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Emit event for controllers
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        const customEvent = new CustomEvent(`task:${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        window.dispatchEvent(customEvent);
    }
}

export default TaskView;
