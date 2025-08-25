/**
 * app.js - Main Application Entry Point
 * 
 * Initializes and coordinates all application components.
 * Sets up the MVC architecture and connects all layers.
 */

// Import all necessary modules
import { TaskController } from './controllers/TaskController.js';
import { FilterController } from './controllers/FilterController.js';
import { TaskView } from './views/TaskView.js';
import { StatsView } from './views/StatsView.js';

/**
 * Main TaskMaster Application Class
 */
class TaskMasterApp {
    constructor() {
        this.controllers = {};
        this.views = {};
        this.isInitialized = false;
        this.debugMode = false; // Set to true for debug logging
        
        // Application state
        this.appState = {
            isLoading: true,
            hasError: false,
            errorMessage: '',
            lastUpdate: null
        };
        
        console.log('🚀 TaskMaster App initializing...');
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            this.showLoadingScreen();
            
            // Initialize controllers in order
            await this.initializeControllers();
            
            // Initialize views
            this.initializeViews();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            // Setup form handlers
            this.setupFormHandlers();
            
            // Setup filter handlers
            this.setupFilterHandlers();
            
            // Initialize app-specific features
            this.initializeAppFeatures();
            
            // Mark as initialized
            this.isInitialized = true;
            this.appState.isLoading = false;
            this.appState.lastUpdate = new Date();
            
            this.hideLoadingScreen();
            
            console.log('✅ TaskMaster App initialized successfully!');
            this.showWelcomeMessage();
            
        } catch (error) {
            console.error('❌ Failed to initialize TaskMaster App:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Initialize controllers
     */
    async initializeControllers() {
        console.log('📱 Initializing controllers...');
        
        // Initialize main task controller
        this.controllers.task = new TaskController();
        await this.controllers.task.initialize();
        
        // Initialize filter controller (depends on task controller)
        this.controllers.filter = new FilterController(this.controllers.task);
        
        if (this.debugMode) {
            console.log('Controllers initialized:', Object.keys(this.controllers));
        }
    }

    /**
     * Initialize views
     */
    initializeViews() {
        console.log('👀 Initializing views...');
        
        // Initialize task view
        this.views.task = new TaskView(this.controllers.task, this.controllers.filter);
        
        // Initialize stats view
        this.views.stats = new StatsView(this.controllers.task);
        
        if (this.debugMode) {
            console.log('Views initialized:', Object.keys(this.views));
        }
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Storage events (for multi-tab sync)
        window.addEventListener('storage', this.handleStorageChange.bind(this));
        
        // Error handling
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
        
        // Visibility change (for performance optimization)
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Task controller events
        window.addEventListener('taskController:openTaskForm', this.handleOpenTaskForm.bind(this));
        
        // Custom application events
        window.addEventListener('taskCreated', this.handleTaskCreated.bind(this));
        window.addEventListener('taskUpdated', this.handleTaskUpdated.bind(this));
        window.addEventListener('taskDeleted', this.handleTaskDeleted.bind(this));
    }

    /**
     * Setup form handlers
     */
    setupFormHandlers() {
        const taskForm = document.getElementById('taskForm');
        if (taskForm) {
            taskForm.addEventListener('submit', this.handleTaskFormSubmit.bind(this));
        }

        // Task form open handler is now set up in setupGlobalEventHandlers

        // Progress range handler is set up below with the other modal handlers
        
        // Modal handlers
        const modalCloseButtons = document.querySelectorAll('.modal-close');
        modalCloseButtons.forEach(btn => {
            btn.addEventListener('click', this.handleModalClose.bind(this));
        });
        
        // Modal backdrop clicks
        const modalBackdrops = document.querySelectorAll('.modal-backdrop');
        modalBackdrops.forEach(backdrop => {
            backdrop.addEventListener('click', this.handleModalBackdropClick.bind(this));
        });
        
        // Progress range input
        const progressRange = document.getElementById('taskProgress');
        const progressValue = document.getElementById('progressValue');
        if (progressRange && progressValue) {
            progressRange.addEventListener('input', (e) => {
                progressValue.textContent = `${e.target.value}%`;
            });
        }
    }

    /**
     * Setup filter handlers
     */
    setupFilterHandlers() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.emit('filter:searchInput', { query: e.target.value });
            });
        }
        
        // Filter selects
        const filterSelects = [
            'statusFilter', 'priorityFilter', 'typeFilter', 
            'dueDateFilter', 'sortBy'
        ];
        
        filterSelects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.addEventListener('change', (e) => {
                    const eventName = selectId.replace('Filter', '').replace('sortBy', 'sort');
                    this.emit(`filter:${eventName}FilterChange`, { 
                        [eventName === 'sort' ? 'sort' : selectId.replace('Filter', '').replace('sortBy', 'sort')]: e.target.value 
                    });
                    
                    // Special handling for sort
                    if (selectId === 'sortBy') {
                        this.emit('task:sortChange', { sort: e.target.value });
                    }
                });
            }
        });
        
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                this.emit('filter:clearFilters');
                this.clearFilterInputs();
            });
        }
    }

    /**
     * Initialize app-specific features
     */
    initializeAppFeatures() {
        // Setup import/export
        this.setupImportExport();
        
        // Setup bulk actions
        this.setupBulkActions();
        
        // Setup periodic data saves
        this.setupPeriodicSave();
        
        // Setup welcome tutorial (for first-time users)
        this.checkFirstTimeUser();
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
    }

    /**
     * Setup import/export functionality
     */
    setupImportExport() {
        const exportBtn = document.getElementById('exportBtn');
        const importBtn = document.getElementById('importBtn');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', this.handleExport.bind(this));
        }
        
        if (importBtn) {
            importBtn.addEventListener('click', this.handleImport.bind(this));
        }
    }

    /**
     * Setup bulk actions
     */
    setupBulkActions() {
        const bulkActionBtns = document.querySelectorAll('.bulk-action-btn');
        bulkActionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.id;
                this.handleBulkAction(action);
            });
        });
    }

    /**
     * Setup periodic data saving
     */
    setupPeriodicSave() {
        // Auto-save every 30 seconds
        setInterval(() => {
            if (this.isInitialized && !this.appState.isLoading) {
                this.controllers.task.taskRepository.persistTasks();
                if (this.debugMode) {
                    console.log('🔄 Auto-save completed');
                }
            }
        }, 30000);
    }

    /**
     * Check if this is a first-time user
     */
    checkFirstTimeUser() {
        const isFirstTime = !localStorage.getItem('taskmaster_welcomed');
        
        if (isFirstTime) {
            this.showWelcomeTutorial();
            localStorage.setItem('taskmaster_welcomed', 'true');
        }
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        if ('performance' in window && this.debugMode) {
            // Log performance metrics
            window.addEventListener('load', () => {
                const perfData = performance.getEntriesByType('navigation')[0];
                console.log('📊 Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
            });
        }
    }

    // ===== EVENT HANDLERS =====

    /**
     * Handle task form submission
     * @param {Event} e - Form event
     */
    async handleTaskFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskData = this.parseFormData(formData);
        
        console.log('Form submitted with data:', taskData);
        
        // Check if editing existing task
        const taskId = e.target.getAttribute('data-task-id');
        const isEdit = Boolean(taskId);
        
        this.emit('task:taskFormSubmit', {
            taskData,
            isEdit,
            taskId
        });
        
        // Hide modal after submission
        this.hideModal('taskModal');
    }

    /**
     * Handle opening task form for editing
     * @param {Object} event - Event data
     */
    handleOpenTaskForm(event) {
        const { task, isEdit } = event.detail;
        
        // Show the modal
        this.showModal('taskModal');
        
        // Populate form if editing
        if (isEdit && task && this.views.task) {
            this.views.task.populateTaskForm(task);
        } else if (this.views.task) {
            // Clear form for new task
            this.views.task.clearTaskForm();
        }
    }

    /**
     * Handle global keydown events
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleGlobalKeydown(e) {
        // Global shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.showModal('taskModal');
                    break;
                case 's':
                    e.preventDefault();
                    this.controllers.task.taskRepository.persistTasks();
                    this.controllers.task.notificationService.success('Data saved!');
                    break;
                case 'f':
                    e.preventDefault();
                    document.getElementById('searchInput')?.focus();
                    break;
                case '/':
                    e.preventDefault();
                    document.getElementById('searchInput')?.focus();
                    break;
            }
        }
        
        // Escape key
        if (e.key === 'Escape') {
            this.hideAllModals();
        }
    }

    /**
     * Handle before unload
     * @param {Event} e - Before unload event
     */
    handleBeforeUnload(e) {
        // Save data before closing
        if (this.isInitialized) {
            this.controllers.task.taskRepository.persistTasks();
        }
    }

    /**
     * Handle online status
     */
    handleOnline() {
        this.controllers.task.notificationService.success('Connection restored');
        if (this.debugMode) {
            console.log('🌐 App is online');
        }
    }

    /**
     * Handle offline status
     */
    handleOffline() {
        this.controllers.task.notificationService.warning('Working offline');
        if (this.debugMode) {
            console.log('📴 App is offline');
        }
    }

    /**
     * Handle storage change (multi-tab sync)
     * @param {StorageEvent} e - Storage event
     */
    handleStorageChange(e) {
        if (e.key && e.key.startsWith('taskmaster_')) {
            // Refresh data when changed in another tab
            setTimeout(() => {
                if (this.isInitialized) {
                    this.controllers.task.loadAndRenderTasks();
                    this.controllers.task.updateStatistics();
                }
            }, 100);
        }
    }

    /**
     * Handle global errors
     * @param {ErrorEvent} e - Error event
     */
    handleGlobalError(e) {
        console.error('Global error:', e.error);
        this.controllers.task?.notificationService?.error('An unexpected error occurred');
    }

    /**
     * Handle unhandled promise rejections
     * @param {PromiseRejectionEvent} e - Promise rejection event
     */
    handleUnhandledRejection(e) {
        console.error('Unhandled promise rejection:', e.reason);
        this.controllers.task?.notificationService?.error('An unexpected error occurred');
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.hidden) {
            // Page hidden - reduce activity
            if (this.debugMode) {
                console.log('👁️ Page hidden');
            }
        } else {
            // Page visible - resume activity
            if (this.debugMode) {
                console.log('👁️ Page visible');
            }
            
            // Refresh data when page becomes visible
            if (this.isInitialized) {
                this.controllers.task.loadAndRenderTasks();
                this.controllers.task.updateStatistics();
            }
        }
    }

    /**
     * Handle task created event
     * @param {CustomEvent} event - Task created event
     */
    handleTaskCreated(event) {
        const { task } = event.detail;
        console.log('✅ Task created:', task?.title || 'Unknown');
        
        // Update UI or perform other actions as needed
        if (this.views.task) {
            // Refresh the task list to show new task
            this.views.task.refreshView();
        }
    }

    /**
     * Handle task updated event
     * @param {CustomEvent} event - Task updated event
     */
    handleTaskUpdated(event) {
        const { task } = event.detail;
        console.log('📝 Task updated:', task?.title || 'Unknown');
        
        // Update UI or perform other actions as needed
        if (this.views.task) {
            // Refresh the task list to show updates
            this.views.task.refreshView();
        }
    }

    /**
     * Handle task deleted event
     * @param {CustomEvent} event - Task deleted event
     */
    handleTaskDeleted(event) {
        const { task } = event.detail;
        console.log('🗑️ Task deleted:', task?.title || 'Unknown');
        
        // Update UI or perform other actions as needed
        if (this.views.task) {
            // Refresh the task list to remove deleted task
            this.views.task.refreshView();
        }
    }

    /**
     * Handle export
     */
    async handleExport() {
        try {
            const data = await this.controllers.task.exportTasks();
            this.downloadFile('taskmaster-export.json', data);
        } catch (error) {
            console.error('Export error:', error);
        }
    }

    /**
     * Handle import
     */
    handleImport() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const data = await this.readFile(file);
                    await this.controllers.task.importTasks(data);
                } catch (error) {
                    console.error('Import error:', error);
                }
            }
        });
        
        input.click();
    }

    /**
     * Handle bulk actions
     * @param {string} action - Action type
     */
    handleBulkAction(action) {
        switch (action) {
            case 'bulkMarkComplete':
                this.emit('task:bulkComplete');
                break;
            case 'bulkDelete':
                this.emit('task:bulkDelete');
                break;
            case 'bulkMarkPending':
                // Implementation for bulk mark pending
                break;
            case 'bulkChangePriority':
                // Implementation for bulk priority change
                break;
        }
        
        this.hideModal('bulkActionsModal');
    }

    // ===== UTILITY METHODS =====

    /**
     * Show modal
     * @param {string} modalId - Modal ID
     */
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                modal.classList.add('active');
            }, 10);
        }
    }

    /**
     * Hide modal
     * @param {string} modalId - Modal ID
     */
    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Hide all modals
     */
    hideAllModals() {
        const modals = document.querySelectorAll('.modal.active');
        modals.forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        });
    }

    /**
     * Handle modal close
     * @param {Event} e - Click event
     */
    handleModalClose(e) {
        const modal = e.target.closest('.modal');
        if (modal) {
            this.hideModal(modal.id);
        }
    }

    /**
     * Handle modal backdrop click
     * @param {Event} e - Click event
     */
    handleModalBackdropClick(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                this.hideModal(modal.id);
            }
        }
    }

    /**
     * Parse form data into task object
     * @param {FormData} formData - Form data
     * @returns {Object} Task data object
     */
    parseFormData(formData) {
        const taskData = {};
        
        // Basic fields
        taskData.title = formData.get('taskTitle')?.trim();
        taskData.description = formData.get('taskDescription')?.trim();
        taskData.type = formData.get('taskType') || 'work'; // Default to work type
        taskData.priority = formData.get('taskPriority') || 'medium'; // Default to medium priority
        
        // Only set status to pending for new tasks, preserve existing status for edits
        const form = document.getElementById('taskForm');
        const isEdit = form && form.hasAttribute('data-task-id');
        if (!isEdit) {
            taskData.status = 'pending'; // Default status for new tasks only
        }
        taskData.progress = parseInt(formData.get('taskProgress')) || 0;
        taskData.estimatedMinutes = parseInt(formData.get('taskEstimate')) || 0;
        taskData.notes = formData.get('taskNotes')?.trim();
        
        // Due date handling
        const dueDate = formData.get('taskDueDate');
        const dueTime = formData.get('taskDueTime');
        if (dueDate) {
            const dateTime = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`;
            taskData.dueDate = new Date(dateTime).toISOString();
        }
        
        // Tags handling
        const tags = formData.get('taskTags');
        if (tags && tags.trim()) {
            taskData.tags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        } else {
            taskData.tags = []; // Default empty array for tags
        }
        
        // Clean up empty strings but preserve meaningful fields
        Object.keys(taskData).forEach(key => {
            if (taskData[key] === '' || taskData[key] === null) {
                // Don't delete these important fields, just set to undefined
                if (['description', 'notes', 'dueDate'].includes(key)) {
                    taskData[key] = undefined;
                } else {
                    delete taskData[key];
                }
            }
        });
        
        // Ensure required fields always have values for new tasks
        if (!taskData.title) taskData.title = 'Untitled Task';
        if (!taskData.type) taskData.type = 'work';
        if (!taskData.priority) taskData.priority = 'medium';
        if (!taskData.status && !isEdit) taskData.status = 'pending';
        
        console.log('Parsed task data:', taskData);
        
        return taskData;
    }

    /**
     * Emit event to window for cross-component communication
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        const customEvent = new CustomEvent(event, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        window.dispatchEvent(customEvent);
        
        if (this.debugMode) {
            console.log(`📡 App emitted event: ${event}`, data);
        }
    }

    /**
     * Clear filter inputs
     */
    clearFilterInputs() {
        document.getElementById('searchInput').value = '';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('priorityFilter').value = 'all';
        document.getElementById('typeFilter').value = 'all';
        document.getElementById('dueDateFilter').value = 'all';
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loading = document.getElementById('loadingState');
        if (loading) {
            loading.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loading = document.getElementById('loadingState');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    /**
     * Show welcome message
     */
    showWelcomeMessage() {
        if (this.controllers.task?.notificationService) {
            this.controllers.task.notificationService.success('Welcome to TaskMaster! 🎉');
        }
    }

    /**
     * Show welcome tutorial
     */
    showWelcomeTutorial() {
        if (this.controllers.task?.notificationService) {
            setTimeout(() => {
                this.controllers.task.notificationService.info(
                    'Welcome to TaskMaster! Click the + button to create your first task.',
                    { duration: 8000 }
                );
            }, 1000);
        }
    }

    /**
     * Handle initialization error
     * @param {Error} error - Error object
     */
    handleInitializationError(error) {
        this.appState.hasError = true;
        this.appState.errorMessage = error.message;
        
        // Show error UI
        document.body.innerHTML = `
            <div class="error-container">
                <h1>❌ Failed to Initialize TaskMaster</h1>
                <p>Sorry, something went wrong while starting the application.</p>
                <details>
                    <summary>Error Details</summary>
                    <pre>${error.message}\n${error.stack}</pre>
                </details>
                <button onclick="location.reload()">Reload Page</button>
            </div>
        `;
    }

    /**
     * Download file
     * @param {string} filename - File name
     * @param {string} data - File data
     */
    downloadFile(filename, data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Read file content
     * @param {File} file - File object
     * @returns {Promise<string>} File content
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e.target.error);
            reader.readAsText(file);
        });
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get application health status
     * @returns {Object} Health status
     */
    getHealthStatus() {
        return {
            isInitialized: this.isInitialized,
            appState: { ...this.appState },
            controllers: Object.keys(this.controllers),
            views: Object.keys(this.views),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Destroy application
     */
    destroy() {
        // Cleanup controllers
        Object.values(this.controllers).forEach(controller => {
            if (controller.destroy) {
                controller.destroy();
            }
        });
        
        // Clear intervals and timeouts
        // (Add any cleanup code here)
        
        this.isInitialized = false;
        console.log('🔄 TaskMaster App destroyed');
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.taskMasterApp = new TaskMasterApp();
    window.taskMasterApp.init();
});

// Make app available globally for debugging
if (typeof window !== 'undefined') {
    window.TaskMasterApp = TaskMasterApp;
}
