/**
 * TaskRepository.js - Repository Pattern Implementation
 * 
 * Handles data persistence, retrieval, and management for tasks.
 * Implements repository pattern with storage abstraction.
 */

import { TaskFactory } from '../models/TaskFactory.js';
import { StorageService } from '../services/StorageService.js';

export class TaskRepository {
    constructor(storageService = null) {
        this.storageService = storageService || new StorageService();
        this.tasks = new Map(); // In-memory cache
        this.isInitialized = false;
        this.eventListeners = new Map(); // For repository events
    }

    /**
     * Initialize repository and load existing tasks
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            const storedTasks = await this.storageService.loadTasks();
            
            // Convert stored objects back to task instances
            storedTasks.forEach(taskData => {
                try {
                    const task = TaskFactory.fromObject(taskData);
                    this.tasks.set(task.id, task);
                } catch (error) {
                    console.warn(`Failed to load task ${taskData.id}:`, error.message);
                }
            });

            this.isInitialized = true;
            this.emit('initialized', { taskCount: this.tasks.size });
        } catch (error) {
            throw new Error(`Failed to initialize TaskRepository: ${error.message}`);
        }
    }

    /**
     * Create and save a new task
     * @param {Object} taskData - Task data
     * @returns {Promise<Task>} Created task
     */
    async create(taskData) {
        try {
            const task = TaskFactory.createTask(taskData.type, taskData);
            this.tasks.set(task.id, task);
            
            await this.persistTasks();
            this.emit('taskCreated', { task });
            
            return task;
        } catch (error) {
            throw new Error(`Failed to create task: ${error.message}`);
        }
    }

    /**
     * Create task from template
     * @param {string} type - Task type
     * @param {string} template - Template name
     * @param {Object} overrides - Override data
     * @returns {Promise<Task>} Created task
     */
    async createFromTemplate(type, template, overrides = {}) {
        try {
            const task = TaskFactory.createFromTemplate(type, template, overrides);
            this.tasks.set(task.id, task);
            
            await this.persistTasks();
            this.emit('taskCreated', { task, fromTemplate: true });
            
            return task;
        } catch (error) {
            throw new Error(`Failed to create task from template: ${error.message}`);
        }
    }

    /**
     * Get task by ID
     * @param {string} id - Task ID
     * @returns {Task|null} Task instance or null
     */
    getById(id) {
        return this.tasks.get(id) || null;
    }

    /**
     * Get all tasks
     * @returns {Task[]} Array of all tasks
     */
    getAll() {
        return Array.from(this.tasks.values());
    }

    /**
     * Update existing task
     * @param {string} id - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Task>} Updated task
     */
    async update(id, updates) {
        const task = this.tasks.get(id);
        if (!task) {
            throw new Error(`Task with ID ${id} not found`);
        }

        try {
            // Apply updates to task with proper date handling
            Object.keys(updates).forEach(key => {
                if (key !== 'id') { // Prevent ID changes
                    if (this.isDateField(key) && updates[key]) {
                        // Parse date fields properly
                        task[key] = task.parseDate(updates[key]);
                    } else {
                        task[key] = updates[key];
                    }
                }
            });

            // Update timestamp
            task.updatedAt = new Date();

            // Re-validate task
            task.validateTask();

            await this.persistTasks();
            this.emit('taskUpdated', { task, updates });
            
            return task;
        } catch (error) {
            throw new Error(`Failed to update task: ${error.message}`);
        }
    }

    /**
     * Delete task by ID
     * @param {string} id - Task ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const task = this.tasks.get(id);
        if (!task) {
            return false;
        }

        this.tasks.delete(id);
        await this.persistTasks();
        this.emit('taskDeleted', { task });
        
        return true;
    }

    /**
     * Delete multiple tasks
     * @param {string[]} ids - Array of task IDs
     * @returns {Promise<number>} Number of deleted tasks
     */
    async deleteMultiple(ids) {
        let deletedCount = 0;
        const deletedTasks = [];

        ids.forEach(id => {
            const task = this.tasks.get(id);
            if (task) {
                this.tasks.delete(id);
                deletedTasks.push(task);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            await this.persistTasks();
            this.emit('tasksDeleted', { tasks: deletedTasks, count: deletedCount });
        }

        return deletedCount;
    }

    /**
     * Find tasks matching criteria
     * @param {Object} criteria - Search criteria
     * @returns {Task[]} Matching tasks
     */
    find(criteria = {}) {
        let tasks = this.getAll();

        // Apply filters
        Object.keys(criteria).forEach(key => {
            const value = criteria[key];
            
            switch (key) {
                case 'type':
                    tasks = tasks.filter(task => task.type === value);
                    break;
                case 'status':
                    tasks = tasks.filter(task => task.status === value);
                    break;
                case 'priority':
                    tasks = tasks.filter(task => task.priority === value);
                    break;
                case 'tags':
                    const requiredTags = Array.isArray(value) ? value : [value];
                    tasks = tasks.filter(task => 
                        requiredTags.every(tag => task.hasTag(tag))
                    );
                    break;
                case 'dueDate':
                    tasks = tasks.filter(task => {
                        if (!task.dueDate) return false;
                        const taskDate = task.dueDate.toDateString();
                        const filterDate = new Date(value).toDateString();
                        return taskDate === filterDate;
                    });
                    break;
                case 'overdue':
                    tasks = tasks.filter(task => task.isOverdue());
                    break;
                case 'completed':
                    tasks = tasks.filter(task => task.status === 'completed');
                    break;
                case 'search':
                    const searchTerm = value.toLowerCase();
                    tasks = tasks.filter(task => 
                        task.title.toLowerCase().includes(searchTerm) ||
                        task.description.toLowerCase().includes(searchTerm) ||
                        task.tags.some(tag => tag.includes(searchTerm))
                    );
                    break;
                case 'createdAfter':
                    const afterDate = new Date(value);
                    tasks = tasks.filter(task => task.createdAt >= afterDate);
                    break;
                case 'createdBefore':
                    const beforeDate = new Date(value);
                    tasks = tasks.filter(task => task.createdAt <= beforeDate);
                    break;
            }
        });

        return tasks;
    }

    /**
     * Find single task matching criteria
     * @param {Object} criteria - Search criteria
     * @returns {Task|null} First matching task or null
     */
    findOne(criteria) {
        const results = this.find(criteria);
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Get tasks by type
     * @param {string} type - Task type
     * @returns {Task[]} Tasks of specified type
     */
    getByType(type) {
        return this.find({ type });
    }

    /**
     * Get tasks by status
     * @param {string} status - Task status
     * @returns {Task[]} Tasks with specified status
     */
    getByStatus(status) {
        return this.find({ status });
    }

    /**
     * Get tasks by priority
     * @param {string} priority - Task priority
     * @returns {Task[]} Tasks with specified priority
     */
    getByPriority(priority) {
        return this.find({ priority });
    }

    /**
     * Get overdue tasks
     * @returns {Task[]} Overdue tasks
     */
    getOverdue() {
        return this.find({ overdue: true });
    }

    /**
     * Get tasks due today
     * @returns {Task[]} Tasks due today
     */
    getDueToday() {
        const today = new Date().toDateString();
        return this.getAll().filter(task => 
            task.dueDate && task.dueDate.toDateString() === today
        );
    }

    /**
     * Get tasks due within specified days
     * @param {number} days - Number of days from now
     * @returns {Task[]} Tasks due within specified period
     */
    getDueWithin(days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + days);
        
        return this.getAll().filter(task => 
            task.dueDate && 
            task.dueDate <= cutoffDate && 
            task.status !== 'completed' &&
            task.status !== 'cancelled'
        );
    }

    /**
     * Search tasks by text
     * @param {string} query - Search query
     * @returns {Task[]} Matching tasks
     */
    search(query) {
        return this.find({ search: query });
    }

    /**
     * Sort tasks by criteria
     * @param {Task[]} tasks - Tasks to sort
     * @param {string} sortBy - Sort criteria
     * @param {string} direction - Sort direction (asc/desc)
     * @returns {Task[]} Sorted tasks
     */
    sort(tasks, sortBy = 'created', direction = 'desc') {
        const sortedTasks = [...tasks];
        
        sortedTasks.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'created':
                case 'created-asc':
                case 'created-desc':
                    aValue = a.createdAt;
                    bValue = b.createdAt;
                    break;
                case 'updated':
                    aValue = a.updatedAt;
                    bValue = b.updatedAt;
                    break;
                case 'title':
                case 'title-asc':
                case 'title-desc':
                    aValue = a.title.toLowerCase();
                    bValue = b.title.toLowerCase();
                    break;
                case 'priority':
                case 'priority-asc':
                case 'priority-desc':
                    aValue = a.getPriorityWeight();
                    bValue = b.getPriorityWeight();
                    break;
                case 'due-date':
                case 'due-date-asc':
                case 'due-date-desc':
                    aValue = a.dueDate || new Date(2100, 0, 1); // Far future for tasks without due date
                    bValue = b.dueDate || new Date(2100, 0, 1);
                    break;
                case 'status':
                case 'status-asc':
                    const statusOrder = { 'pending': 1, 'in-progress': 2, 'completed': 3, 'cancelled': 4 };
                    aValue = statusOrder[a.status] || 5;
                    bValue = statusOrder[b.status] || 5;
                    break;
                case 'progress':
                    aValue = a.progress;
                    bValue = b.progress;
                    break;
                default:
                    aValue = a.createdAt;
                    bValue = b.createdAt;
            }
            
            // Determine direction from sortBy if it includes direction
            const actualDirection = sortBy.includes('-desc') ? 'desc' : 
                                  sortBy.includes('-asc') ? 'asc' : direction;
            
            if (aValue < bValue) {
                return actualDirection === 'asc' ? -1 : 1;
            } else if (aValue > bValue) {
                return actualDirection === 'asc' ? 1 : -1;
            } else {
                return 0;
            }
        });
        
        return sortedTasks;
    }

    /**
     * Get repository statistics
     * @returns {Object} Repository statistics
     */
    getStats() {
        const tasks = this.getAll();
        const stats = {
            total: tasks.length,
            byStatus: {},
            byType: {},
            byPriority: {},
            completed: 0,
            overdue: 0,
            dueToday: 0,
            dueThisWeek: 0
        };

        // Count by status
        tasks.forEach(task => {
            stats.byStatus[task.status] = (stats.byStatus[task.status] || 0) + 1;
            stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
            stats.byPriority[task.priority] = (stats.byPriority[task.priority] || 0) + 1;
            
            if (task.status === 'completed') {
                stats.completed++;
            }
            if (task.isOverdue()) {
                stats.overdue++;
            }
            if (task.isDueToday()) {
                stats.dueToday++;
            }
        });

        // Due this week
        stats.dueThisWeek = this.getDueWithin(7).length;
        
        // Completion rate
        stats.completionRate = stats.total > 0 ? (stats.completed / stats.total * 100).toFixed(1) : 0;

        return stats;
    }

    /**
     * Export all tasks to JSON
     * @returns {string} JSON string of all tasks
     */
    export() {
        const tasks = this.getAll().map(task => task.toObject());
        return JSON.stringify(tasks, null, 2);
    }

    /**
     * Import tasks from JSON
     * @param {string} jsonData - JSON string of tasks
     * @returns {Promise<number>} Number of imported tasks
     */
    async import(jsonData) {
        try {
            const tasksData = JSON.parse(jsonData);
            if (!Array.isArray(tasksData)) {
                throw new Error('Invalid JSON format: expected array of tasks');
            }

            let importedCount = 0;
            const errors = [];

            for (const taskData of tasksData) {
                try {
                    // Generate new ID to avoid conflicts
                    const task = TaskFactory.fromObject({ ...taskData, id: undefined });
                    this.tasks.set(task.id, task);
                    importedCount++;
                } catch (error) {
                    errors.push(`Failed to import task "${taskData.title}": ${error.message}`);
                }
            }

            if (importedCount > 0) {
                await this.persistTasks();
                this.emit('tasksImported', { count: importedCount, errors });
            }

            return importedCount;
        } catch (error) {
            throw new Error(`Failed to import tasks: ${error.message}`);
        }
    }

    /**
     * Clear all tasks
     * @returns {Promise<void>}
     */
    async clear() {
        const taskCount = this.tasks.size;
        this.tasks.clear();
        await this.persistTasks();
        this.emit('tasksCleared', { count: taskCount });
    }

    /**
     * Persist tasks to storage
     * @returns {Promise<void>}
     * @private
     */
    async persistTasks() {
        const tasksArray = this.getAll().map(task => task.toObject());
        await this.storageService.saveTasks(tasksArray);
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
    }

    /**
     * Emit event to listeners
     * @param {string} event - Event name
     * @param {Object} data - Event data
     * @private
     */
    emit(event, data = {}) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    /**
     * Get repository health information
     * @returns {Object} Health information
     */
    getHealth() {
        const stats = this.getStats();
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };

        // Check for issues
        if (stats.overdue > 0) {
            health.issues.push(`${stats.overdue} overdue tasks`);
            health.recommendations.push('Review and reschedule overdue tasks');
        }

        if (stats.total > 1000) {
            health.issues.push('Large number of tasks may impact performance');
            health.recommendations.push('Consider archiving completed tasks');
        }

        if (stats.completionRate < 50) {
            health.issues.push('Low completion rate');
            health.recommendations.push('Review task priorities and goals');
        }

        // Set status
        if (health.issues.length === 0) {
            health.status = 'healthy';
        } else if (health.issues.length <= 2) {
            health.status = 'warning';
        } else {
            health.status = 'needs-attention';
        }

        return health;
    }

    /**
     * Check if a field is a date field
     * @param {string} fieldName - Field name to check
     * @returns {boolean} True if field is a date field
     */
    isDateField(fieldName) {
        const dateFields = ['createdAt', 'updatedAt', 'dueDate', 'completedAt'];
        return dateFields.includes(fieldName);
    }
}

export default TaskRepository;
