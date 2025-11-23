/**
 * app.js - FlashTodo PWA Main Application
 * 
 * Main application controller that orchestrates all components and services
 */

import { 
    APP_INFO, 
    TODO_STATUS, 
    PRIORITY, 
    DEFAULTS, 
    UTILS, 
    SUCCESS_MESSAGES, 
    ERROR_MESSAGES,
    EVENTS
} from './utils/constants.js';

import StorageService from './services/StorageService.js';
import PWAService from './services/PWAService.js';
import FlashCard from './components/FlashCard.js';
import FolderManager from './components/FolderManager.js';
import FilterManager from './components/FilterManager.js';

class FlashTodoApp {
    constructor() {
        console.log(`🚀 ${APP_INFO.NAME} v${APP_INFO.VERSION} initializing...`);
        
        // Services
        this.storageService = null;
        this.pwaService = null;
        
        // Components
        this.folderManager = null;
        this.filterManager = null;
        
        // State
        this.todos = [];
        this.flashCards = new Map(); // Map of todo ID to FlashCard instance
        this.currentEditingTodo = null;
        this.isInitialized = false;
        
        // DOM elements
        this.todoModal = null;
        this.todoForm = null;
        this.flashCardsGrid = null;
        this.emptyState = null;
        this.todosCount = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.initializeServices();
            await this.initializeComponents();
            this.setupDOMElements();
            this.attachEventListeners();
            this.setupKeyboardShortcuts();
            
            await this.loadInitialData();
            this.renderTodos();
            this.updateUI();
            
            this.isInitialized = true;
            console.log('✅ FlashTodo initialized successfully');
            
            // Show install prompt if appropriate
            this.pwaService?.setupNetworkMonitoring();
            
        } catch (error) {
            console.error('❌ Failed to initialize FlashTodo:', error);
            this.showNotification(ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR, 'error');
        }
    }

    /**
     * Initialize services
     */
    async initializeServices() {
        console.log('🔧 Initializing services...');
        
        // Storage service
        this.storageService = new StorageService();
        
        // PWA service
        this.pwaService = new PWAService();
    }

    /**
     * Initialize components
     */
    async initializeComponents() {
        console.log('🧩 Initializing components...');
        
        // Folder manager
        this.folderManager = new FolderManager(this.storageService, {
            onFolderCreated: (folder) => this.handleFolderCreated(folder),
            onFolderUpdated: (folder) => this.handleFolderUpdated(folder),
            onFolderDeleted: (folderId) => this.handleFolderDeleted(folderId),
            onFolderSelected: (folderId) => this.handleFolderSelected(folderId)
        });
        
        // Filter manager
        this.filterManager = new FilterManager({
            onFiltersChanged: (filters) => this.handleFiltersChanged(filters),
            onViewChanged: (view) => this.handleViewChanged(view)
        });
    }

    /**
     * Setup DOM elements
     */
    setupDOMElements() {
        this.todoModal = document.getElementById('todo-modal');
        this.todoForm = document.getElementById('todo-form');
        this.flashCardsGrid = document.getElementById('flash-cards-grid');
        this.emptyState = document.getElementById('empty-state');
        this.todosCount = document.getElementById('todos-count');
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Add todo button
        const addTodoBtn = document.getElementById('add-todo-btn');
        if (addTodoBtn) {
            addTodoBtn.addEventListener('click', () => {
                this.showCreateTodoModal();
            });
        }

        // Todo form submission
        if (this.todoForm) {
            this.todoForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTodoFormSubmit();
            });
        }

        // Modal close handlers
        this.setupModalHandlers();

        // PWA shortcut handlers
        window.addEventListener('pwa:shortcut', (e) => {
            this.handlePWAShortcut(e.detail);
        });

        // Flash card events
        window.addEventListener('flashcard:tagClicked', (e) => {
            this.filterManager?.addTagFilter(e.detail.tag);
        });

        window.addEventListener('flashcard:duplicate', (e) => {
            this.duplicateTodo(e.detail.todo);
        });

        window.addEventListener('flashcard:toast', (e) => {
            this.showNotification(e.detail.message, e.detail.type);
        });

        // Storage events
        window.addEventListener('storage:todoSaved', () => {
            this.loadInitialData();
        });

        window.addEventListener('storage:todoDeleted', () => {
            this.loadInitialData();
        });

        // Network status
        window.addEventListener('online', () => {
            this.showNotification('🌐 Back online!', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNotification('📶 Working offline', 'warning');
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.isInitialized) {
                this.handleAppBecameVisible();
            }
        });
    }

    /**
     * Setup modal handlers
     */
    setupModalHandlers() {
        if (!this.todoModal) return;

        // Close button
        const closeBtn = this.todoModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideTodoModal();
            });
        }

        // Backdrop click
        const backdrop = this.todoModal.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                this.hideTodoModal();
            });
        }

        // Cancel button
        const cancelBtn = document.getElementById('cancel-todo-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideTodoModal();
            });
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.todoModal?.classList.contains('show')) {
                this.hideTodoModal();
            }
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle if not in input field
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.tagName === 'SELECT') {
                return;
            }

            switch (e.key.toLowerCase()) {
                case 'n':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showCreateTodoModal();
                    }
                    break;
                    
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.refreshData();
                    }
                    break;
            }
        });
    }

    /**
     * Load initial data
     */
    async loadInitialData() {
        try {
            this.todos = await this.storageService.getAllTodos();
            
            // Update available tags in filter manager
            this.filterManager?.updateAvailableTags(this.todos);
            
            // Update folder counts
            await this.folderManager?.updateFolderCounts();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification(ERROR_MESSAGES.STORAGE.LOAD_FAILED, 'error');
        }
    }

    /**
     * Render todos as flash cards
     */
    renderTodos() {
        if (!this.flashCardsGrid) return;

        // Clear existing flash cards
        this.clearFlashCards();

        // Apply filters
        const filteredTodos = this.filterManager?.filterTodos(this.todos) || this.todos;
        
        // Sort todos (you can make this configurable)
        const sortedTodos = this.filterManager?.sortTodos(filteredTodos, 'createdAt', 'desc') || filteredTodos;

        // Show/hide empty state
        if (sortedTodos.length === 0) {
            this.showEmptyState();
            return;
        } else {
            this.hideEmptyState();
        }

        // Create flash cards
        sortedTodos.forEach((todo, index) => {
            const flashCard = new FlashCard(todo, {
                viewMode: this.filterManager?.getCurrentView() || 'cards',
                onClick: (todo) => this.handleTodoClick(todo),
                onEdit: (todo) => this.editTodo(todo),
                onDelete: (todo) => this.deleteTodo(todo.id),
                onStatusChange: (todo, oldStatus, newStatus) => this.handleStatusChange(todo, oldStatus, newStatus),
                onPriorityChange: (todo, oldPriority, newPriority) => this.handlePriorityChange(todo, oldPriority, newPriority)
            });

            const cardElement = flashCard.render();
            
            // Add staggered animation delay
            cardElement.style.animationDelay = `${index * 50}ms`;
            
            this.flashCardsGrid.appendChild(cardElement);
            this.flashCards.set(todo.id, flashCard);
        });

        this.updateTodosCount(sortedTodos.length);
    }

    /**
     * Clear all flash cards
     */
    clearFlashCards() {
        // Destroy existing flash cards
        this.flashCards.forEach(flashCard => {
            flashCard.destroy();
        });
        this.flashCards.clear();

        // Clear grid
        if (this.flashCardsGrid) {
            this.flashCardsGrid.innerHTML = '';
        }
    }

    /**
     * Show empty state
     */
    showEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.remove('hidden');
        }
        
        if (this.flashCardsGrid) {
            this.flashCardsGrid.classList.add('hidden');
        }
    }

    /**
     * Hide empty state
     */
    hideEmptyState() {
        if (this.emptyState) {
            this.emptyState.classList.add('hidden');
        }
        
        if (this.flashCardsGrid) {
            this.flashCardsGrid.classList.remove('hidden');
        }
    }

    /**
     * Update todos count display
     * @param {number} count - Number of todos
     */
    updateTodosCount(count) {
        if (this.todosCount) {
            const totalCount = this.todos.length;
            const text = count === totalCount 
                ? `${count} todo${count !== 1 ? 's' : ''}` 
                : `${count} of ${totalCount} todo${totalCount !== 1 ? 's' : ''}`;
            this.todosCount.textContent = text;
        }
    }

    /**
     * Show create todo modal
     */
    showCreateTodoModal() {
        this.currentEditingTodo = null;
        this.resetTodoForm();
        
        // Populate folder dropdown
        this.folderManager?.populateFolderSelect();
        
        this.showTodoModal('Add New Todo');
    }

    /**
     * Edit existing todo
     * @param {Object} todo - Todo to edit
     */
    editTodo(todo) {
        this.currentEditingTodo = todo;
        this.populateTodoForm(todo);
        
        // Populate folder dropdown
        this.folderManager?.populateFolderSelect();
        
        this.showTodoModal('Edit Todo');
    }

    /**
     * Show todo modal
     * @param {string} title - Modal title
     */
    showTodoModal(title) {
        if (!this.todoModal) return;

        const titleElement = this.todoModal.querySelector('#modal-title');
        if (titleElement) {
            titleElement.textContent = title;
        }

        this.todoModal.classList.add('show');

        // Focus on title input
        const titleInput = this.todoForm?.querySelector('#todo-title');
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    }

    /**
     * Hide todo modal
     */
    hideTodoModal() {
        if (this.todoModal) {
            this.todoModal.classList.remove('show');
            this.currentEditingTodo = null;
        }
    }

    /**
     * Reset todo form
     */
    resetTodoForm() {
        if (!this.todoForm) return;
        
        this.todoForm.reset();
        
        // Set defaults
        const statusSelect = this.todoForm.querySelector('#todo-status');
        const prioritySelect = this.todoForm.querySelector('#todo-priority');
        
        if (statusSelect) statusSelect.value = TODO_STATUS.TODO;
        if (prioritySelect) prioritySelect.value = PRIORITY.MEDIUM;
    }

    /**
     * Populate todo form with existing data
     * @param {Object} todo - Todo data
     */
    populateTodoForm(todo) {
        if (!this.todoForm) return;

        const fields = {
            'todo-title': todo.title,
            'todo-description': todo.description || '',
            'todo-status': todo.status,
            'todo-priority': todo.priority,
            'todo-folder': todo.folder || '',
            'todo-tags': (todo.tags || []).join(', '),
            'todo-due': todo.dueDate ? todo.dueDate.split('T')[0] : ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = this.todoForm.querySelector(`#${id}`);
            if (element) {
                element.value = value;
            }
        });
    }

    /**
     * Handle todo form submission
     */
    async handleTodoFormSubmit() {
        try {
            const formData = new FormData(this.todoForm);
            const todoData = this.parseTodoFormData(formData);

            // Validate
            this.validateTodoData(todoData);

            if (this.currentEditingTodo) {
                await this.updateTodo(this.currentEditingTodo.id, todoData);
            } else {
                await this.createTodo(todoData);
            }

            this.hideTodoModal();

        } catch (error) {
            console.error('Failed to save todo:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Parse todo form data
     * @param {FormData} formData - Form data
     * @returns {Object} Parsed todo data
     */
    parseTodoFormData(formData) {
        const tags = formData.get('tags')?.trim();
        const dueDate = formData.get('dueDate')?.trim();

        return {
            title: formData.get('title')?.trim() || '',
            description: formData.get('description')?.trim() || '',
            status: formData.get('status') || TODO_STATUS.TODO,
            priority: formData.get('priority') || PRIORITY.MEDIUM,
            folder: formData.get('folder') || null,
            tags: tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            dueDate: dueDate || null
        };
    }

    /**
     * Validate todo data
     * @param {Object} todoData - Todo data to validate
     */
    validateTodoData(todoData) {
        if (!todoData.title || todoData.title.length === 0) {
            throw new Error('Todo title is required');
        }

        if (todoData.title.length > 200) {
            throw new Error('Todo title cannot exceed 200 characters');
        }

        if (todoData.description && todoData.description.length > 1000) {
            throw new Error('Description cannot exceed 1000 characters');
        }

        if (todoData.tags.length > 10) {
            throw new Error('Cannot have more than 10 tags');
        }

        if (todoData.dueDate) {
            const date = new Date(todoData.dueDate);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid due date');
            }
        }
    }

    /**
     * Create new todo
     * @param {Object} todoData - Todo data
     */
    async createTodo(todoData) {
        const todo = {
            id: UTILS.generateId(),
            ...DEFAULTS.TODO,
            ...todoData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await this.storageService.saveTodo(todo);
            this.todos.push(todo);
            
            this.renderTodos();
            this.updateUI();
            
            this.showNotification(SUCCESS_MESSAGES.TODO.CREATED, 'success');
            
            // Track analytics
            this.trackEvent(EVENTS.TODO_CREATED, { 
                status: todo.status, 
                priority: todo.priority,
                hasFolder: !!todo.folder,
                hasTags: todo.tags.length > 0,
                hasDueDate: !!todo.dueDate
            });
            
        } catch (error) {
            throw new Error(`Failed to create todo: ${error.message}`);
        }
    }

    /**
     * Update existing todo
     * @param {string} todoId - Todo ID
     * @param {Object} todoData - Updated todo data
     */
    async updateTodo(todoId, todoData) {
        const todoIndex = this.todos.findIndex(t => t.id === todoId);
        if (todoIndex === -1) {
            throw new Error('Todo not found');
        }

        const updatedTodo = {
            ...this.todos[todoIndex],
            ...todoData,
            updatedAt: new Date().toISOString()
        };

        try {
            await this.storageService.saveTodo(updatedTodo);
            this.todos[todoIndex] = updatedTodo;
            
            this.renderTodos();
            this.updateUI();
            
            this.showNotification(SUCCESS_MESSAGES.TODO.UPDATED, 'success');
            
            // Track analytics
            this.trackEvent(EVENTS.TODO_UPDATED, { todoId, changes: Object.keys(todoData) });
            
        } catch (error) {
            throw new Error(`Failed to update todo: ${error.message}`);
        }
    }

    /**
     * Delete todo
     * @param {string} todoId - Todo ID
     */
    async deleteTodo(todoId) {
        try {
            await this.storageService.deleteTodo(todoId);
            
            this.todos = this.todos.filter(t => t.id !== todoId);
            
            // Remove flash card
            const flashCard = this.flashCards.get(todoId);
            if (flashCard) {
                flashCard.destroy();
                this.flashCards.delete(todoId);
            }
            
            this.renderTodos();
            this.updateUI();
            
            this.showNotification(SUCCESS_MESSAGES.TODO.DELETED, 'success');
            
            // Track analytics
            this.trackEvent(EVENTS.TODO_DELETED, { todoId });
            
        } catch (error) {
            console.error('Failed to delete todo:', error);
            this.showNotification(ERROR_MESSAGES.STORAGE.SAVE_FAILED, 'error');
        }
    }

    /**
     * Duplicate todo
     * @param {Object} todo - Todo to duplicate
     */
    async duplicateTodo(todo) {
        const duplicatedTodo = {
            ...todo,
            id: UTILS.generateId(),
            title: `${todo.title} (Copy)`,
            status: TODO_STATUS.TODO,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: null
        };

        try {
            await this.storageService.saveTodo(duplicatedTodo);
            this.todos.push(duplicatedTodo);
            
            this.renderTodos();
            this.updateUI();
            
            this.showNotification('Todo duplicated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to duplicate todo:', error);
            this.showNotification('Failed to duplicate todo', 'error');
        }
    }

    /**
     * Handle todo click
     * @param {Object} todo - Clicked todo
     */
    handleTodoClick(todo) {
        // For now, clicking opens edit modal
        // Could be expanded to show detail view
        this.editTodo(todo);
    }

    /**
     * Handle status change
     * @param {Object} todo - Todo object
     * @param {string} oldStatus - Old status
     * @param {string} newStatus - New status
     */
    async handleStatusChange(todo, oldStatus, newStatus) {
        try {
            // Update local todo
            const todoIndex = this.todos.findIndex(t => t.id === todo.id);
            if (todoIndex >= 0) {
                this.todos[todoIndex] = todo;
            }
            
            // Save to storage
            await this.storageService.saveTodo(todo);
            
            this.updateUI();
            
            this.showNotification(SUCCESS_MESSAGES.TODO.STATUS_CHANGED, 'success');
            
            // Track analytics
            this.trackEvent(EVENTS.TODO_STATUS_CHANGED, { 
                todoId: todo.id, 
                oldStatus, 
                newStatus 
            });
            
        } catch (error) {
            console.error('Failed to update status:', error);
            this.showNotification('Failed to update status', 'error');
        }
    }

    /**
     * Handle priority change
     * @param {Object} todo - Todo object
     * @param {string} oldPriority - Old priority
     * @param {string} newPriority - New priority
     */
    async handlePriorityChange(todo, oldPriority, newPriority) {
        try {
            // Update local todo
            const todoIndex = this.todos.findIndex(t => t.id === todo.id);
            if (todoIndex >= 0) {
                this.todos[todoIndex] = todo;
            }
            
            // Save to storage
            await this.storageService.saveTodo(todo);
            
            this.showNotification('Priority updated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to update priority:', error);
            this.showNotification('Failed to update priority', 'error');
        }
    }

    /**
     * Handle filters changed
     * @param {Object} filters - Current filters
     */
    handleFiltersChanged(filters) {
        this.renderTodos();
    }

    /**
     * Handle view changed
     * @param {string} view - New view mode
     */
    handleViewChanged(view) {
        // Re-render todos with new view
        this.renderTodos();
        
        // Track analytics
        this.trackEvent(EVENTS.VIEW_CHANGED, { view });
    }

    /**
     * Handle folder created
     * @param {Object} folder - Created folder
     */
    handleFolderCreated(folder) {
        // Update UI as needed
        this.updateUI();
    }

    /**
     * Handle folder updated
     * @param {Object} folder - Updated folder
     */
    handleFolderUpdated(folder) {
        // Update todos that use this folder
        this.renderTodos();
    }

    /**
     * Handle folder deleted
     * @param {string} folderId - Deleted folder ID
     */
    handleFolderDeleted(folderId) {
        // Re-load data to reflect changes
        this.loadInitialData().then(() => {
            this.renderTodos();
        });
    }

    /**
     * Handle folder selected
     * @param {string} folderId - Selected folder ID
     */
    handleFolderSelected(folderId) {
        // Set folder filter
        this.filterManager?.setFolderFilter(folderId);
    }

    /**
     * Handle PWA shortcut
     * @param {Object} shortcut - Shortcut detail
     */
    handlePWAShortcut(shortcut) {
        switch (shortcut.action) {
            case 'new-todo':
                this.showCreateTodoModal();
                break;
                
            case 'filter-completed':
                this.filterManager?.setStatusFilter(TODO_STATUS.COMPLETED);
                break;
        }
    }

    /**
     * Handle app became visible
     */
    async handleAppBecameVisible() {
        // Refresh data when app becomes visible
        await this.loadInitialData();
        this.renderTodos();
        this.updateUI();
    }

    /**
     * Refresh all data
     */
    async refreshData() {
        try {
            await this.loadInitialData();
            this.renderTodos();
            this.updateUI();
            
            this.showNotification('Data refreshed!', 'success');
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.showNotification('Failed to refresh data', 'error');
        }
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update folder counts
        this.folderManager?.updateFolderCounts();
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('app-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'app-notification';
            notification.className = 'app-notification';
            document.body.appendChild(notification);
        }
        
        // Set content and type
        notification.textContent = message;
        notification.className = `app-notification ${type} show`;
        
        // Auto-hide after delay
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }

    /**
     * Track analytics event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    trackEvent(event, data = {}) {
        // This would integrate with analytics service
        console.log(`📊 Event: ${event}`, data);
        
        // Dispatch for other components
        window.dispatchEvent(new CustomEvent('analytics:track', {
            detail: { event, data, timestamp: new Date().toISOString() }
        }));
    }

    /**
     * Export all data
     * @returns {Object} Exported data
     */
    async exportData() {
        try {
            const data = await this.storageService.exportData();
            
            // Add additional metadata
            data.folders = this.folderManager?.exportFolders() || [];
            data.filters = this.filterManager?.exportState() || {};
            
            return data;
            
        } catch (error) {
            console.error('Failed to export data:', error);
            throw error;
        }
    }

    /**
     * Import data
     * @param {Object} data - Data to import
     */
    async importData(data) {
        try {
            const result = await this.storageService.importData(data);
            
            // Import folders if available
            if (data.folders) {
                await this.folderManager?.importFolders(data.folders);
            }
            
            // Import filter state if available
            if (data.filters) {
                this.filterManager?.importState(data.filters);
            }
            
            // Refresh UI
            await this.loadInitialData();
            this.renderTodos();
            this.updateUI();
            
            this.showNotification(`Imported ${result.imported} items successfully!`, 'success');
            
            return result;
            
        } catch (error) {
            console.error('Failed to import data:', error);
            this.showNotification('Failed to import data', 'error');
            throw error;
        }
    }

    /**
     * Clear all data
     */
    async clearAllData() {
        const confirmed = confirm('Are you sure you want to clear all data? This cannot be undone.');
        if (!confirmed) return;

        try {
            await this.storageService.clearAllData();
            
            this.todos = [];
            this.clearFlashCards();
            this.showEmptyState();
            this.updateTodosCount(0);
            
            // Reset components
            await this.folderManager?.loadFolders();
            this.filterManager?.clearAllFilters();
            
            this.showNotification('All data cleared', 'success');
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            this.showNotification('Failed to clear data', 'error');
        }
    }

    /**
     * Get app statistics
     * @returns {Object} App statistics
     */
    getStatistics() {
        const stats = {
            totalTodos: this.todos.length,
            byStatus: {},
            byPriority: {},
            byFolder: {},
            completedToday: 0,
            overdueTodos: 0,
            totalTags: this.filterManager?.getAvailableTags().length || 0
        };

        // Count by status
        Object.values(TODO_STATUS).forEach(status => {
            stats.byStatus[status] = this.todos.filter(t => t.status === status).length;
        });

        // Count by priority
        Object.values(PRIORITY).forEach(priority => {
            stats.byPriority[priority] = this.todos.filter(t => t.priority === priority).length;
        });

        // Count completed today
        const today = new Date().toDateString();
        stats.completedToday = this.todos.filter(t => 
            t.status === TODO_STATUS.COMPLETED && 
            t.completedAt && 
            new Date(t.completedAt).toDateString() === today
        ).length;

        // Count overdue
        stats.overdueTodos = this.todos.filter(t => 
            t.dueDate && UTILS.isOverdue(t.dueDate) && t.status !== TODO_STATUS.COMPLETED
        ).length;

        return stats;
    }

    /**
     * Destroy the application
     */
    destroy() {
        // Clean up components
        this.folderManager?.destroy();
        this.filterManager?.destroy();
        this.pwaService?.destroy();
        
        // Clear flash cards
        this.clearFlashCards();
        
        // Clear data
        this.todos = [];
        
        console.log('🧹 FlashTodo application cleaned up');
    }
}

// Initialize app when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.flashTodoApp = new FlashTodoApp();
    });
} else {
    window.flashTodoApp = new FlashTodoApp();
}

// Export for module systems
export default FlashTodoApp;
