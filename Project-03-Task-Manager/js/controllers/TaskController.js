/**
 * TaskController.js - Main Task Controller
 * 
 * Handles task management business logic, coordinates between models, views, and services.
 * Implements MVC pattern for task operations and state management.
 */

import { TaskRepository } from '../repositories/TaskRepository.js';
import { TaskFactory } from '../models/TaskFactory.js';
import { ValidationService } from '../services/ValidationService.js';
import { NotificationService } from '../services/NotificationService.js';
import { StorageService } from '../services/StorageService.js';

export class TaskController {
    constructor() {
        this.taskRepository = new TaskRepository(new StorageService());
        this.validationService = new ValidationService();
        this.notificationService = new NotificationService();
        
        // State management
        this.currentView = 'card'; // card, list, kanban
        this.selectedTasks = new Set();
        this.currentFilter = {};
        this.currentSort = 'created-desc';
        this.currentPage = 1;
        this.tasksPerPage = 10;
        this.isInitialized = false;
        
        // Event listeners registry
        this.eventListeners = new Map();
        
        // Initialize controller
        this.initialize();
    }

    /**
     * Initialize the task controller
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            // Initialize repository
            await this.taskRepository.initialize();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data and render
            await this.loadAndRenderTasks();
            
            // Update statistics
            this.updateStatistics();
            
            this.isInitialized = true;
            this.emit('controllerInitialized');
            
            console.log('TaskController initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize TaskController:', error);
            this.notificationService.error('Failed to initialize application');
        }
    }

    /**
     * Setup event listeners for UI interactions
     */
    setupEventListeners() {
        // Task form submission - listen for app events only
        this.addEventListener('task:taskFormSubmit', this.handleTaskFormSubmit.bind(this));
        
        // Task actions
        this.addEventListener('taskComplete', this.handleTaskComplete.bind(this));
        this.addEventListener('taskEdit', this.handleTaskEdit.bind(this));
        this.addEventListener('taskDelete', this.handleTaskDelete.bind(this));
        this.addEventListener('taskDuplicate', this.handleTaskDuplicate.bind(this));
        
        // Bulk actions
        this.addEventListener('bulkComplete', this.handleBulkComplete.bind(this));
        this.addEventListener('bulkDelete', this.handleBulkDelete.bind(this));
        
        // View changes
        this.addEventListener('viewChange', this.handleViewChange.bind(this));
        this.addEventListener('sortChange', this.handleSortChange.bind(this));
        
        // Task selection
        this.addEventListener('taskSelect', this.handleTaskSelection.bind(this));
        this.addEventListener('selectAll', this.handleSelectAll.bind(this));
        
        // Repository events - handle low-level data changes
        this.taskRepository.addEventListener('taskCreated', this.onTaskCreated.bind(this));
        this.taskRepository.addEventListener('taskUpdated', this.onTaskUpdated.bind(this));
        this.taskRepository.addEventListener('taskDeleted', this.onTaskDeleted.bind(this));
        
        // Storage events
        window.addEventListener('storage:tasksSaved', this.onTasksSaved.bind(this));
        window.addEventListener('storage:tasksLoaded', this.onTasksLoaded.bind(this));
        
        // Notification events
        window.addEventListener('notification:undoTaskCompletion', this.handleUndoCompletion.bind(this));
        window.addEventListener('notification:viewOverdueTasks', this.handleViewOverdueTasks.bind(this));
    }

    /**
     * Create new task
     * @param {Object} taskData - Task data from form
     * @returns {Promise<Object>} Result object
     */
    async createTask(taskData) {
        try {
            console.log('Creating task with data:', taskData);
            
            // Validate task data
            const validation = this.validationService.validateTask(taskData);
            console.log('Validation result:', validation);
            
            if (!validation.valid) {
                const errors = validation.errors.join(', ');
                console.error('Validation failed:', validation.errors);
                this.notificationService.error(`Validation failed: ${errors}`);
                return { success: false, errors: validation.errors };
            }

            // Create task using factory
            const task = await this.taskRepository.create(validation.sanitizedData);
            
            // Show success notification
            this.notificationService.success(`Task "${task.title}" created successfully!`);
            
            // Refresh UI
            await this.loadAndRenderTasks();
            this.updateStatistics();
            
            // Repository already emitted taskCreated event
            return { success: true, task };
            
        } catch (error) {
            console.error('Error creating task:', error);
            this.notificationService.error(`Failed to create task: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update existing task
     * @param {string} taskId - Task ID
     * @param {Object} updates - Task updates
     * @returns {Promise<Object>} Result object
     */
    async updateTask(taskId, updates) {
        try {
            const existingTask = this.taskRepository.getById(taskId);
            if (!existingTask) {
                throw new Error('Task not found');
            }

            // Validate updates
            const mergedData = { ...existingTask.toObject(), ...updates };
            const validation = this.validationService.validateTask(mergedData);
            
            if (!validation.valid) {
                const errors = validation.errors.join(', ');
                this.notificationService.warning(`Validation issues: ${errors}`);
            }

            // Update task
            const updatedTask = await this.taskRepository.update(taskId, validation.sanitizedData);

            this.notificationService.success(`Task "${updatedTask.title}" updated successfully!`);
            
            // Refresh UI
            await this.loadAndRenderTasks();
            this.updateStatistics();
            
            // this.emit('taskUpdated', { task: updatedTask });
            
            return { success: true, task: updatedTask };
            
        } catch (error) {
            console.error('Error updating task:', error);
            this.notificationService.error(`Failed to update task: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Delete task
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Result object
     */
    async deleteTask(taskId) {
        try {
            const task = this.taskRepository.getById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            const taskTitle = task.title;
            const success = await this.taskRepository.delete(taskId);
            
            if (success) {
                this.notificationService.success(`Task "${taskTitle}" deleted successfully!`);
                
                // Remove from selected tasks if it was selected
                this.selectedTasks.delete(taskId);
                
                // Refresh UI
                await this.loadAndRenderTasks();
                this.updateStatistics();
                
                // Repository already emitted taskDeleted event
                return { success: true };
            } else {
                throw new Error('Delete operation failed');
            }
            
        } catch (error) {
            console.error('Error deleting task:', error);
            this.notificationService.error(`Failed to delete task: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Complete task
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Result object
     */
    async completeTask(taskId) {
        try {
            const task = this.taskRepository.getById(taskId);
            if (!task) {
                throw new Error('Task not found');
            }

            // Update task status and completion data
            const updates = {
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString()
            };
            
            const updatedTask = await this.taskRepository.update(taskId, updates);
            
            // Show completion notification with undo option
            this.notificationService.taskCompleted(updatedTask);
            
            // Refresh UI
            await this.loadAndRenderTasks();
            this.updateStatistics();
            
            // Repository already emitted taskUpdated event
            return { success: true, task: updatedTask };
            
        } catch (error) {
            console.error('Error completing task:', error);
            this.notificationService.error(`Failed to complete task: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Duplicate task
     * @param {string} taskId - Task ID to duplicate
     * @returns {Promise<Object>} Result object
     */
    async duplicateTask(taskId) {
        try {
            const originalTask = this.taskRepository.getById(taskId);
            if (!originalTask) {
                throw new Error('Task not found');
            }

            // Create duplicate with modified title and reset status
            const duplicateData = {
                ...originalTask.toObject(),
                id: undefined, // Let factory generate new ID
                title: `${originalTask.title} (Copy)`,
                status: 'pending',
                progress: 0,
                completedAt: null,
                createdAt: undefined, // Will be set to current time
                updatedAt: undefined
            };

            const duplicateTask = await this.taskRepository.create(duplicateData);
            
            this.notificationService.success(`Task duplicated as "${duplicateTask.title}"`);
            
            // Refresh UI
            await this.loadAndRenderTasks();
            this.updateStatistics();
            
            // Repository already emitted taskCreated event for the duplicate
            return { success: true, task: duplicateTask };
            
        } catch (error) {
            console.error('Error duplicating task:', error);
            this.notificationService.error(`Failed to duplicate task: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk complete tasks
     * @param {string[]} taskIds - Array of task IDs
     * @returns {Promise<Object>} Result object
     */
    async bulkComplete(taskIds = null) {
        try {
            const ids = taskIds || Array.from(this.selectedTasks);
            if (ids.length === 0) {
                this.notificationService.warning('No tasks selected');
                return { success: false, message: 'No tasks selected' };
            }

            let completedCount = 0;
            const errors = [];

            for (const taskId of ids) {
                try {
                    const result = await this.completeTask(taskId);
                    if (result.success) {
                        completedCount++;
                    }
                } catch (error) {
                    errors.push(`Failed to complete task ${taskId}: ${error.message}`);
                }
            }

            // Clear selection
            this.selectedTasks.clear();

            if (completedCount > 0) {
                this.notificationService.bulkOperation('completed', completedCount);
            }

            if (errors.length > 0) {
                this.notificationService.warning(`${errors.length} tasks failed to complete`);
            }

            return { success: true, completed: completedCount, errors };

        } catch (error) {
            console.error('Error in bulk complete:', error);
            this.notificationService.error('Failed to complete selected tasks');
            return { success: false, error: error.message };
        }
    }

    /**
     * Bulk delete tasks
     * @param {string[]} taskIds - Array of task IDs
     * @returns {Promise<Object>} Result object
     */
    async bulkDelete(taskIds = null) {
        try {
            const ids = taskIds || Array.from(this.selectedTasks);
            if (ids.length === 0) {
                this.notificationService.warning('No tasks selected');
                return { success: false, message: 'No tasks selected' };
            }

            // Confirm deletion
            const confirmed = await this.notificationService.confirm(
                `Are you sure you want to delete ${ids.length} task${ids.length > 1 ? 's' : ''}? This action cannot be undone.`,
                { confirmLabel: 'Delete', cancelLabel: 'Cancel' }
            );

            if (!confirmed) {
                return { success: false, message: 'Operation cancelled' };
            }

            const deletedCount = await this.taskRepository.deleteMultiple(ids);
            
            // Clear selection
            this.selectedTasks.clear();

            if (deletedCount > 0) {
                this.notificationService.bulkOperation('deleted', deletedCount);
                
                // Refresh UI
                await this.loadAndRenderTasks();
                this.updateStatistics();
            }

            return { success: true, deleted: deletedCount };

        } catch (error) {
            console.error('Error in bulk delete:', error);
            this.notificationService.error('Failed to delete selected tasks');
            return { success: false, error: error.message };
        }
    }

    /**
     * Load and render tasks with current filters and sorting
     */
    async loadAndRenderTasks() {
        try {
            // Get filtered and sorted tasks
            let tasks = this.taskRepository.find(this.currentFilter);
            tasks = this.taskRepository.sort(tasks, this.currentSort);
            
            // Apply pagination
            const totalTasks = tasks.length;
            const totalPages = Math.ceil(totalTasks / this.tasksPerPage);
            const startIndex = (this.currentPage - 1) * this.tasksPerPage;
            const endIndex = startIndex + this.tasksPerPage;
            const paginatedTasks = tasks.slice(startIndex, endIndex);
            
            // Emit event for views to update
            this.emit('tasksLoaded', {
                tasks: paginatedTasks,
                totalTasks,
                totalPages,
                currentPage: this.currentPage,
                view: this.currentView
            });
            
        } catch (error) {
            console.error('Error loading and rendering tasks:', error);
            this.notificationService.error('Failed to load tasks');
        }
    }

    /**
     * Update application statistics
     */
    updateStatistics() {
        try {
            const stats = this.taskRepository.getStats();
            const overdueTasks = this.taskRepository.getOverdue();
            const dueToday = this.taskRepository.getDueToday();
            
            // Enhanced stats
            const enhancedStats = {
                ...stats,
                overdue: overdueTasks.length,
                dueToday: dueToday.length,
                dueThisWeek: this.taskRepository.getDueWithin(7).length,
                selected: this.selectedTasks.size
            };
            
            this.emit('statisticsUpdated', enhancedStats);
            
            // Show overdue notification if needed
            if (overdueTasks.length > 0 && !this.hasShownOverdueWarning) {
                this.notificationService.tasksOverdue(overdueTasks);
                this.hasShownOverdueWarning = true;
            }
            
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }

    /**
     * Change view mode
     * @param {string} viewMode - View mode (card, list, kanban)
     */
    changeView(viewMode) {
        if (['card', 'list', 'kanban'].includes(viewMode)) {
            this.currentView = viewMode;
            this.emit('viewChanged', { view: viewMode });
            this.loadAndRenderTasks();
        }
    }

    /**
     * Change sorting
     * @param {string} sortBy - Sort criteria
     */
    changeSort(sortBy) {
        this.currentSort = sortBy;
        this.emit('sortChanged', { sort: sortBy });
        this.loadAndRenderTasks();
    }

    /**
     * Apply filters
     * @param {Object} filters - Filter criteria
     */
    applyFilters(filters) {
        this.currentFilter = { ...filters };
        this.currentPage = 1; // Reset to first page
        this.emit('filtersChanged', { filters });
        this.loadAndRenderTasks();
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.currentFilter = {};
        this.currentPage = 1;
        this.emit('filtersCleared');
        this.loadAndRenderTasks();
    }

    /**
     * Change page
     * @param {number} page - Page number
     */
    changePage(page) {
        const stats = this.taskRepository.getStats();
        const totalPages = Math.ceil(stats.total / this.tasksPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.loadAndRenderTasks();
        }
    }

    /**
     * Export tasks
     * @param {string} format - Export format (json, csv)
     * @returns {Promise<string>} Exported data
     */
    async exportTasks(format = 'json') {
        try {
            if (format === 'json') {
                const data = this.taskRepository.export();
                this.notificationService.success('Tasks exported successfully!');
                return data;
            } else {
                throw new Error(`Export format "${format}" not supported yet`);
            }
        } catch (error) {
            console.error('Error exporting tasks:', error);
            this.notificationService.error(`Failed to export tasks: ${error.message}`);
            throw error;
        }
    }

    /**
     * Import tasks
     * @param {string} data - Import data
     * @param {string} format - Import format
     * @returns {Promise<Object>} Result object
     */
    async importTasks(data, format = 'json') {
        try {
            if (format === 'json') {
                const importedCount = await this.taskRepository.import(data);
                
                if (importedCount > 0) {
                    this.notificationService.success(`Successfully imported ${importedCount} tasks!`);
                    
                    // Refresh UI
                    await this.loadAndRenderTasks();
                    this.updateStatistics();
                }
                
                return { success: true, imported: importedCount };
            } else {
                throw new Error(`Import format "${format}" not supported yet`);
            }
        } catch (error) {
            console.error('Error importing tasks:', error);
            this.notificationService.error(`Failed to import tasks: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    // ===== EVENT HANDLERS =====

    /**
     * Handle task form submission
     * @param {Object} event - Event data
     */
    async handleTaskFormSubmit(event) {
        const { taskData, isEdit, taskId } = event.detail;
        
        if (isEdit) {
            await this.updateTask(taskId, taskData);
        } else {
            await this.createTask(taskData);
        }
    }

    /**
     * Handle task completion
     * @param {Object} event - Event data
     */
    async handleTaskComplete(event) {
        const { taskId } = event.detail;
        await this.completeTask(taskId);
    }

    /**
     * Handle task edit
     * @param {Object} event - Event data
     */
    handleTaskEdit(event) {
        const { taskId } = event.detail;
        const task = this.taskRepository.getById(taskId);
        
        if (task) {
            this.emit('openTaskForm', { task, isEdit: true });
        }
    }

    /**
     * Handle task deletion
     * @param {Object} event - Event data
     */
    async handleTaskDelete(event) {
        const { taskId } = event.detail;
        await this.deleteTask(taskId);
    }

    /**
     * Handle task duplication
     * @param {Object} event - Event data
     */
    async handleTaskDuplicate(event) {
        const { taskId } = event.detail;
        await this.duplicateTask(taskId);
    }

    /**
     * Handle bulk complete
     * @param {Object} event - Event data
     */
    async handleBulkComplete(event) {
        await this.bulkComplete(event.detail?.taskIds);
    }

    /**
     * Handle bulk delete
     * @param {Object} event - Event data
     */
    async handleBulkDelete(event) {
        await this.bulkDelete(event.detail?.taskIds);
    }

    /**
     * Handle bulk edit
     * @param {Object} event - Event data
     */
    async handleBulkEdit(event) {
        const { taskIds, updates } = event.detail;
        // Implementation for bulk edit functionality
        this.notificationService.info('Bulk edit functionality coming soon!');
    }

    /**
     * Handle view change
     * @param {Object} event - Event data
     */
    handleViewChange(event) {
        const { view } = event.detail;
        this.changeView(view);
    }

    /**
     * Handle sort change
     * @param {Object} event - Event data
     */
    handleSortChange(event) {
        const { sort } = event.detail;
        this.changeSort(sort);
    }

    /**
     * Handle task selection
     * @param {Object} event - Event data
     */
    handleTaskSelection(event) {
        const { taskId, selected } = event.detail;
        
        if (selected) {
            this.selectedTasks.add(taskId);
        } else {
            this.selectedTasks.delete(taskId);
        }
        
        this.emit('selectionChanged', {
            selectedCount: this.selectedTasks.size,
            selectedTasks: Array.from(this.selectedTasks)
        });
    }

    /**
     * Handle select all
     * @param {Object} event - Event data
     */
    handleSelectAll(event) {
        const tasks = this.taskRepository.find(this.currentFilter);
        
        if (this.selectedTasks.size === tasks.length) {
            // Deselect all
            this.selectedTasks.clear();
        } else {
            // Select all visible tasks
            tasks.forEach(task => this.selectedTasks.add(task.id));
        }
        
        this.emit('selectionChanged', {
            selectedCount: this.selectedTasks.size,
            selectedTasks: Array.from(this.selectedTasks)
        });
    }

    /**
     * Handle undo completion
     * @param {Object} event - Event data
     */
    async handleUndoCompletion(event) {
        const { task } = event.detail;
        
        try {
            await this.updateTask(task.id, {
                status: 'in-progress',
                progress: Math.max(0, task.progress - 10),
                completedAt: null
            });
        } catch (error) {
            this.notificationService.error('Failed to undo task completion');
        }
    }

    /**
     * Handle view overdue tasks
     * @param {Object} event - Event data
     */
    handleViewOverdueTasks(event) {
        this.applyFilters({ overdue: true });
        this.notificationService.info('Showing overdue tasks');
    }

    // ===== REPOSITORY EVENT HANDLERS =====

    /**
     * Handle task created event from repository
     * @param {Object} data - Event data from repository
     */
    onTaskCreated(data) {
        console.log('Task created:', data.task.title);
        
        // Emit window event for app-level handling
        const customEvent = new CustomEvent('taskController:taskCreated', {
            detail: { task: data.task, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(customEvent);
    }

    /**
     * Handle task updated event from repository
     * @param {Object} data - Event data from repository
     */
    onTaskUpdated(data) {
        console.log('Task updated:', data.task.title);
        
        // Emit window event for app-level handling
        const customEvent = new CustomEvent('taskController:taskUpdated', {
            detail: { task: data.task, updates: data.updates, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(customEvent);
    }

    /**
     * Handle task deleted event from repository
     * @param {Object} data - Event data from repository
     */
    onTaskDeleted(data) {
        console.log('Task deleted:', data.task.title);
        
        // Emit window event for app-level handling
        const customEvent = new CustomEvent('taskController:taskDeleted', {
            detail: { task: data.task, timestamp: new Date().toISOString() }
        });
        window.dispatchEvent(customEvent);
    }

    onTasksSaved(event) {
        console.log('Tasks saved to storage:', event.detail.count);
    }

    onTasksLoaded(event) {
        console.log('Tasks loaded from storage:', event.detail.count);
    }

    // ===== UTILITY METHODS =====

    /**
     * Get current state
     * @returns {Object} Current controller state
     */
    getState() {
        return {
            currentView: this.currentView,
            selectedTasks: Array.from(this.selectedTasks),
            currentFilter: { ...this.currentFilter },
            currentSort: this.currentSort,
            currentPage: this.currentPage,
            tasksPerPage: this.tasksPerPage,
            isInitialized: this.isInitialized
        };
    }

    /**
     * Get task statistics
     * @returns {Object} Task statistics
     */
    getStatistics() {
        return this.taskRepository.getStats();
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
        
        // Also listen to window events for UI interactions
        window.addEventListener(`task:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        }
        
        window.removeEventListener(`task:${event}`, callback);
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        // Internal listeners
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback({ detail: data });
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
        
        // Window event for UI components
        const customEvent = new CustomEvent(`taskController:${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        window.dispatchEvent(customEvent);
    }

    /**
     * Destroy controller and cleanup
     */
    destroy() {
        this.eventListeners.clear();
        this.selectedTasks.clear();
        console.log('TaskController destroyed');
    }
}

export default TaskController;
