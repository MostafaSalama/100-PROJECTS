/**
 * TaskService.js - Task Business Service
 * 
 * High-level business logic service for task operations.
 * Orchestrates between controllers, repositories, and other services.
 */

import { TaskFactory } from '../models/TaskFactory.js';
import { validators } from '../utils/validators.js';

export class TaskService {
    constructor(taskRepository, validationService, notificationService) {
        this.taskRepository = taskRepository;
        this.validationService = validationService;
        this.notificationService = notificationService;
        
        // Business rules cache
        this.businessRules = new Map();
        
        this.initializeBusinessRules();
    }

    /**
     * Initialize business rules
     */
    initializeBusinessRules() {
        // Define business rules for different operations
        this.businessRules.set('createTask', [
            this.validateTaskCreation.bind(this),
            this.enforceTaskLimits.bind(this),
            this.applyDefaultValues.bind(this)
        ]);
        
        this.businessRules.set('updateTask', [
            this.validateTaskUpdate.bind(this),
            this.enforceStatusTransitions.bind(this),
            this.validateDependencies.bind(this)
        ]);
        
        this.businessRules.set('deleteTask', [
            this.validateTaskDeletion.bind(this),
            this.handleDependentTasks.bind(this)
        ]);
    }

    /**
     * Create a new task with business logic
     * @param {Object} taskData - Task data
     * @returns {Promise<Object>} Operation result
     */
    async createTask(taskData) {
        try {
            // Apply business rules
            const processedData = await this.applyBusinessRules('createTask', taskData);
            
            // Create task using factory
            const task = await this.taskRepository.create(processedData);
            
            // Post-creation business logic
            await this.executePostCreationLogic(task);
            
            return {
                success: true,
                task: task,
                message: `${task.type} task "${task.title}" created successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code || 'TASK_CREATION_FAILED'
            };
        }
    }

    /**
     * Update existing task with business logic
     * @param {string} taskId - Task ID
     * @param {Object} updates - Updates to apply
     * @returns {Promise<Object>} Operation result
     */
    async updateTask(taskId, updates) {
        try {
            const existingTask = this.taskRepository.getById(taskId);
            if (!existingTask) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            // Merge existing data with updates
            const mergedData = { ...existingTask.toObject(), ...updates };
            
            // Apply business rules
            const processedData = await this.applyBusinessRules('updateTask', mergedData, existingTask);
            
            // Update task
            const updatedTask = await this.taskRepository.update(taskId, processedData);
            
            // Post-update business logic
            await this.executePostUpdateLogic(updatedTask, existingTask);
            
            return {
                success: true,
                task: updatedTask,
                message: `Task "${updatedTask.title}" updated successfully`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code || 'TASK_UPDATE_FAILED'
            };
        }
    }

    /**
     * Delete task with business logic
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Operation result
     */
    async deleteTask(taskId) {
        try {
            const task = this.taskRepository.getById(taskId);
            if (!task) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            // Apply business rules
            await this.applyBusinessRules('deleteTask', task);
            
            // Delete task
            const success = await this.taskRepository.delete(taskId);
            
            if (success) {
                // Post-deletion business logic
                await this.executePostDeletionLogic(task);
                
                return {
                    success: true,
                    message: `Task "${task.title}" deleted successfully`
                };
            } else {
                throw new Error('Failed to delete task');
            }
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: error.code || 'TASK_DELETION_FAILED'
            };
        }
    }

    /**
     * Complete task with business logic
     * @param {string} taskId - Task ID
     * @returns {Promise<Object>} Operation result
     */
    async completeTask(taskId) {
        try {
            const task = this.taskRepository.getById(taskId);
            if (!task) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            // Business rule: Check if task can be completed
            const canComplete = await this.canCompleteTask(task);
            if (!canComplete.allowed) {
                throw new Error(canComplete.reason);
            }

            // Update task to completed
            const updates = {
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString()
            };

            const result = await this.updateTask(taskId, updates);
            
            if (result.success) {
                // Business logic for task completion
                await this.executeTaskCompletionLogic(result.task);
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'TASK_COMPLETION_FAILED'
            };
        }
    }

    /**
     * Duplicate task with business logic
     * @param {string} taskId - Task ID to duplicate
     * @returns {Promise<Object>} Operation result
     */
    async duplicateTask(taskId) {
        try {
            const originalTask = this.taskRepository.getById(taskId);
            if (!originalTask) {
                throw new Error(`Task with ID ${taskId} not found`);
            }

            // Create duplicate data
            const duplicateData = this.prepareDuplicateData(originalTask);
            
            // Create duplicate task
            const result = await this.createTask(duplicateData);
            
            if (result.success) {
                result.message = `Task duplicated as "${result.task.title}"`;
                result.originalTask = originalTask;
            }
            
            return result;
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                code: 'TASK_DUPLICATION_FAILED'
            };
        }
    }

    // ===== BUSINESS RULES =====

    /**
     * Apply business rules to operation
     * @param {string} operation - Operation type
     * @param {Object} data - Data to process
     * @param {Object} context - Additional context
     * @returns {Promise<Object>} Processed data
     */
    async applyBusinessRules(operation, data, context = null) {
        const rules = this.businessRules.get(operation) || [];
        let processedData = { ...data };
        
        for (const rule of rules) {
            processedData = await rule(processedData, context);
        }
        
        return processedData;
    }

    /**
     * Validate task creation
     * @param {Object} data - Task data
     * @returns {Promise<Object>} Validated data
     */
    async validateTaskCreation(data) {
        const validation = validators.validateCompleteTask(data);
        
        if (!validation.valid) {
            const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
            error.code = 'VALIDATION_FAILED';
            throw error;
        }
        
        return data;
    }

    /**
     * Enforce task limits
     * @param {Object} data - Task data
     * @returns {Promise<Object>} Data with limits enforced
     */
    async enforceTaskLimits(data) {
        const totalTasks = this.taskRepository.getAll().length;
        const maxTasks = 1000; // Business rule: max 1000 tasks
        
        if (totalTasks >= maxTasks) {
            const error = new Error(`Cannot create task: Maximum limit of ${maxTasks} tasks reached`);
            error.code = 'TASK_LIMIT_EXCEEDED';
            throw error;
        }
        
        return data;
    }

    /**
     * Apply default values based on business rules
     * @param {Object} data - Task data
     * @returns {Promise<Object>} Data with defaults applied
     */
    async applyDefaultValues(data) {
        // Apply type-specific defaults
        const typeConfig = this.getTypeConfiguration(data.type);
        
        return {
            ...typeConfig.defaults,
            ...data
        };
    }

    /**
     * Validate task update
     * @param {Object} data - Updated task data
     * @param {Object} originalTask - Original task
     * @returns {Promise<Object>} Validated data
     */
    async validateTaskUpdate(data, originalTask) {
        const validation = validators.validateCompleteTask(data);
        
        if (!validation.valid) {
            const error = new Error(`Validation failed: ${validation.errors.join(', ')}`);
            error.code = 'VALIDATION_FAILED';
            throw error;
        }
        
        // Business rule: Some fields cannot be changed after completion
        if (originalTask.status === 'completed') {
            const protectedFields = ['type', 'createdAt'];
            const changedProtectedFields = protectedFields.filter(field => 
                data[field] !== originalTask[field]
            );
            
            if (changedProtectedFields.length > 0) {
                const error = new Error(`Cannot modify ${changedProtectedFields.join(', ')} after task completion`);
                error.code = 'MODIFICATION_NOT_ALLOWED';
                throw error;
            }
        }
        
        return data;
    }

    /**
     * Enforce status transitions
     * @param {Object} data - Task data
     * @param {Object} originalTask - Original task
     * @returns {Promise<Object>} Data with valid transitions
     */
    async enforceStatusTransitions(data, originalTask) {
        const allowedTransitions = {
            'pending': ['in-progress', 'cancelled'],
            'in-progress': ['completed', 'pending', 'cancelled'],
            'completed': ['in-progress'], // Allow reopening
            'cancelled': ['pending', 'in-progress']
        };
        
        if (data.status && data.status !== originalTask.status) {
            const allowed = allowedTransitions[originalTask.status] || [];
            
            if (!allowed.includes(data.status)) {
                const error = new Error(`Invalid status transition from ${originalTask.status} to ${data.status}`);
                error.code = 'INVALID_STATUS_TRANSITION';
                throw error;
            }
        }
        
        return data;
    }

    /**
     * Validate task dependencies
     * @param {Object} data - Task data
     * @returns {Promise<Object>} Validated data
     */
    async validateDependencies(data) {
        if (data.dependencies && Array.isArray(data.dependencies)) {
            // Check for circular dependencies
            const hasCircularDependency = await this.detectCircularDependency(data.id, data.dependencies);
            
            if (hasCircularDependency) {
                const error = new Error('Circular dependency detected');
                error.code = 'CIRCULAR_DEPENDENCY';
                throw error;
            }
        }
        
        return data;
    }

    /**
     * Validate task deletion
     * @param {Object} task - Task to delete
     * @returns {Promise<Object>} Task data
     */
    async validateTaskDeletion(task) {
        // Business rule: Cannot delete tasks with active dependencies
        const dependentTasks = this.findDependentTasks(task.id);
        
        if (dependentTasks.length > 0) {
            const error = new Error(`Cannot delete task: ${dependentTasks.length} task(s) depend on this task`);
            error.code = 'HAS_DEPENDENCIES';
            error.dependentTasks = dependentTasks;
            throw error;
        }
        
        return task;
    }

    /**
     * Handle dependent tasks before deletion
     * @param {Object} task - Task being deleted
     * @returns {Promise<Object>} Task data
     */
    async handleDependentTasks(task) {
        // Remove this task from other tasks' dependencies
        const allTasks = this.taskRepository.getAll();
        
        for (const otherTask of allTasks) {
            if (otherTask.dependencies && otherTask.dependencies.includes(task.id)) {
                const updatedDependencies = otherTask.dependencies.filter(dep => dep !== task.id);
                await this.taskRepository.update(otherTask.id, { dependencies: updatedDependencies });
            }
        }
        
        return task;
    }

    // ===== POST-OPERATION LOGIC =====

    /**
     * Execute post-creation business logic
     * @param {Object} task - Created task
     */
    async executePostCreationLogic(task) {
        // Trigger task creation events
        this.notificationService?.success(`${task.type} task "${task.title}" created successfully!`);
        
        // Update related tasks if needed
        if (task.dependencies && task.dependencies.length > 0) {
            await this.updateDependentTasksStatus(task);
        }
    }

    /**
     * Execute post-update business logic
     * @param {Object} updatedTask - Updated task
     * @param {Object} originalTask - Original task
     */
    async executePostUpdateLogic(updatedTask, originalTask) {
        // Status change notifications
        if (updatedTask.status !== originalTask.status) {
            const statusMessages = {
                'completed': `Task "${updatedTask.title}" has been completed! 🎉`,
                'in-progress': `Task "${updatedTask.title}" is now in progress`,
                'cancelled': `Task "${updatedTask.title}" has been cancelled`
            };
            
            const message = statusMessages[updatedTask.status];
            if (message) {
                this.notificationService?.info(message);
            }
        }
    }

    /**
     * Execute post-deletion business logic
     * @param {Object} deletedTask - Deleted task
     */
    async executePostDeletionLogic(deletedTask) {
        this.notificationService?.success(`Task "${deletedTask.title}" deleted successfully!`);
    }

    /**
     * Execute task completion logic
     * @param {Object} task - Completed task
     */
    async executeTaskCompletionLogic(task) {
        // Check if this completion unblocks other tasks
        const unblockedTasks = await this.findUnblockedTasks(task.id);
        
        if (unblockedTasks.length > 0) {
            this.notificationService?.info(
                `Completing this task has unblocked ${unblockedTasks.length} other task(s)!`
            );
        }
    }

    // ===== HELPER METHODS =====

    /**
     * Check if task can be completed
     * @param {Object} task - Task to check
     * @returns {Promise<Object>} Check result
     */
    async canCompleteTask(task) {
        // Business rules for task completion
        if (task.type === 'work' && task.requiresApproval && !task.approvedBy) {
            return {
                allowed: false,
                reason: 'Work task requires approval before completion'
            };
        }
        
        if (task.type === 'project' && task.dependencies) {
            const incompleteDependencies = await this.getIncompleteDependencies(task.dependencies);
            if (incompleteDependencies.length > 0) {
                return {
                    allowed: false,
                    reason: `Cannot complete: ${incompleteDependencies.length} dependencies are incomplete`
                };
            }
        }
        
        return { allowed: true };
    }

    /**
     * Prepare duplicate task data
     * @param {Object} originalTask - Original task
     * @returns {Object} Duplicate task data
     */
    prepareDuplicateData(originalTask) {
        const data = originalTask.toObject();
        
        return {
            ...data,
            id: undefined, // Let factory generate new ID
            title: `${data.title} (Copy)`,
            status: 'pending',
            progress: 0,
            completedAt: null,
            createdAt: undefined,
            updatedAt: undefined
        };
    }

    /**
     * Get type-specific configuration
     * @param {string} type - Task type
     * @returns {Object} Type configuration
     */
    getTypeConfiguration(type) {
        const configurations = {
            work: {
                defaults: { priority: 'medium', workLocation: 'office' }
            },
            personal: {
                defaults: { category: 'general', motivationLevel: 5 }
            },
            project: {
                defaults: { phase: 'planning', storyPoints: 1 }
            }
        };
        
        return configurations[type] || { defaults: {} };
    }

    /**
     * Detect circular dependencies
     * @param {string} taskId - Task ID
     * @param {Array} dependencies - Dependencies to check
     * @returns {Promise<boolean>} True if circular dependency exists
     */
    async detectCircularDependency(taskId, dependencies) {
        const visited = new Set();
        const recursionStack = new Set();
        
        const dfs = (currentId, deps) => {
            if (recursionStack.has(currentId)) {
                return true; // Circular dependency found
            }
            
            if (visited.has(currentId)) {
                return false;
            }
            
            visited.add(currentId);
            recursionStack.add(currentId);
            
            for (const depId of deps || []) {
                const depTask = this.taskRepository.getById(depId);
                if (depTask && dfs(depId, depTask.dependencies)) {
                    return true;
                }
            }
            
            recursionStack.delete(currentId);
            return false;
        };
        
        return dfs(taskId, dependencies);
    }

    /**
     * Find tasks that depend on given task
     * @param {string} taskId - Task ID
     * @returns {Array} Dependent tasks
     */
    findDependentTasks(taskId) {
        const allTasks = this.taskRepository.getAll();
        
        return allTasks.filter(task => 
            task.dependencies && 
            task.dependencies.includes(taskId) &&
            task.status !== 'completed' &&
            task.status !== 'cancelled'
        );
    }

    /**
     * Find tasks unblocked by completion
     * @param {string} completedTaskId - ID of completed task
     * @returns {Promise<Array>} Unblocked tasks
     */
    async findUnblockedTasks(completedTaskId) {
        const allTasks = this.taskRepository.getAll();
        const unblockedTasks = [];
        
        for (const task of allTasks) {
            if (task.dependencies && task.dependencies.includes(completedTaskId)) {
                const remainingDependencies = await this.getIncompleteDependencies(task.dependencies);
                if (remainingDependencies.length === 0) {
                    unblockedTasks.push(task);
                }
            }
        }
        
        return unblockedTasks;
    }

    /**
     * Get incomplete dependencies
     * @param {Array} dependencies - Dependency IDs
     * @returns {Promise<Array>} Incomplete dependencies
     */
    async getIncompleteDependencies(dependencies) {
        const incomplete = [];
        
        for (const depId of dependencies) {
            const depTask = this.taskRepository.getById(depId);
            if (depTask && depTask.status !== 'completed') {
                incomplete.push(depTask);
            }
        }
        
        return incomplete;
    }

    /**
     * Update dependent tasks status
     * @param {Object} task - Task with dependencies
     */
    async updateDependentTasksStatus(task) {
        // Implementation for updating related tasks when dependencies change
        // This could include notifications, status updates, etc.
    }
}

export default TaskService;
