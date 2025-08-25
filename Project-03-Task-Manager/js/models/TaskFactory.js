/**
 * TaskFactory.js - Task Factory Pattern Implementation
 * 
 * Factory pattern for creating different types of tasks.
 * Handles task creation, validation, and type-specific initialization.
 */

import { Task } from './Task.js';
import { WorkTask } from './WorkTask.js';
import { PersonalTask } from './PersonalTask.js';
import { ProjectTask } from './ProjectTask.js';

export class TaskFactory {
    /**
     * Registry of available task types
     */
    static taskTypes = {
        'work': WorkTask,
        'personal': PersonalTask,
        'project': ProjectTask,
        'reminder': PersonalTask, // Reminders are personal tasks
        'meeting': WorkTask, // Meetings are work tasks
        'goal': PersonalTask // Goals are personal tasks
    };

    /**
     * Create a new task of the specified type
     * @param {string} type - Task type
     * @param {Object} data - Task data
     * @returns {Task} New task instance
     * @throws {Error} If task type is invalid
     */
    static createTask(type, data = {}) {
        if (!type || typeof type !== 'string') {
            throw new Error('Task type is required and must be a string');
        }

        const normalizedType = type.toLowerCase().trim();
        const TaskClass = this.taskTypes[normalizedType];

        if (!TaskClass) {
            throw new Error(`Unknown task type: ${type}. Available types: ${this.getAvailableTypes().join(', ')}`);
        }

        try {
            // Ensure the type is set correctly in the data
            const taskData = { ...data, type: normalizedType };
            
            // Apply type-specific defaults
            const defaultData = this.getTypeDefaults(normalizedType);
            const mergedData = { ...defaultData, ...taskData };

            // Create and return the task
            const task = new TaskClass(mergedData);
            
            // Apply post-creation setup
            this.applyPostCreationSetup(task, normalizedType);
            
            return task;
        } catch (error) {
            throw new Error(`Failed to create ${type} task: ${error.message}`);
        }
    }

    /**
     * Create task from template
     * @param {string} type - Task type
     * @param {string} template - Template name
     * @param {Object} overrides - Data to override template defaults
     * @returns {Task} New task instance
     */
    static createFromTemplate(type, template, overrides = {}) {
        const TaskClass = this.taskTypes[type.toLowerCase()];
        if (!TaskClass || !TaskClass.getTemplate) {
            throw new Error(`No templates available for task type: ${type}`);
        }

        const templateData = TaskClass.getTemplate(template);
        if (Object.keys(templateData).length === 0) {
            throw new Error(`Template "${template}" not found for task type: ${type}`);
        }

        const mergedData = { ...templateData, ...overrides, type };
        return this.createTask(type, mergedData);
    }

    /**
     * Create task from plain object (for deserialization)
     * @param {Object} obj - Plain object representation
     * @returns {Task} Task instance
     */
    static fromObject(obj) {
        if (!obj || typeof obj !== 'object') {
            throw new Error('Object is required for task creation');
        }

        if (!obj.type) {
            throw new Error('Task type is required in object');
        }

        return this.createTask(obj.type, obj);
    }

    /**
     * Create multiple tasks from array
     * @param {Array} tasksData - Array of task data objects
     * @returns {Array} Array of task instances
     */
    static createMultiple(tasksData) {
        if (!Array.isArray(tasksData)) {
            throw new Error('Tasks data must be an array');
        }

        return tasksData.map((taskData, index) => {
            try {
                return this.fromObject(taskData);
            } catch (error) {
                throw new Error(`Failed to create task at index ${index}: ${error.message}`);
            }
        });
    }

    /**
     * Get available task types
     * @returns {Array} Array of available task types
     */
    static getAvailableTypes() {
        return Object.keys(this.taskTypes);
    }

    /**
     * Check if task type is valid
     * @param {string} type - Task type to check
     * @returns {boolean} True if type is valid
     */
    static isValidType(type) {
        return type && this.taskTypes.hasOwnProperty(type.toLowerCase());
    }

    /**
     * Get task class for given type
     * @param {string} type - Task type
     * @returns {Function} Task class constructor
     */
    static getTaskClass(type) {
        return this.taskTypes[type.toLowerCase()] || null;
    }

    /**
     * Register a new task type
     * @param {string} type - Task type name
     * @param {Function} TaskClass - Task class constructor
     */
    static registerTaskType(type, TaskClass) {
        if (!type || typeof type !== 'string') {
            throw new Error('Task type name is required');
        }

        if (!TaskClass || typeof TaskClass !== 'function') {
            throw new Error('Task class constructor is required');
        }

        // Validate that the class extends Task
        if (!(TaskClass.prototype instanceof Task)) {
            throw new Error('Task class must extend the base Task class');
        }

        this.taskTypes[type.toLowerCase()] = TaskClass;
    }

    /**
     * Unregister a task type
     * @param {string} type - Task type to remove
     */
    static unregisterTaskType(type) {
        delete this.taskTypes[type.toLowerCase()];
    }

    /**
     * Get type-specific default values
     * @param {string} type - Task type
     * @returns {Object} Default values for the type
     */
    static getTypeDefaults(type) {
        const defaults = {
            work: {
                priority: 'medium',
                workLocation: 'office',
                billableHours: 0
            },
            personal: {
                category: 'general',
                energyLevel: 'medium',
                motivationLevel: 5,
                location: 'home'
            },
            project: {
                phase: 'planning',
                storyPoints: 1,
                assignees: [],
                dependencies: []
            },
            reminder: {
                category: 'general',
                energyLevel: 'low',
                priority: 'medium'
            },
            meeting: {
                meetingRequired: true,
                estimatedMinutes: 60,
                workLocation: 'office'
            },
            goal: {
                category: 'general',
                motivationLevel: 8,
                healthImpact: 'positive'
            }
        };

        return defaults[type] || {};
    }

    /**
     * Apply post-creation setup to task
     * @param {Task} task - Task instance
     * @param {string} type - Task type
     */
    static applyPostCreationSetup(task, type) {
        // Add type-specific tags
        task.addTags(type);

        // Apply type-specific setup
        switch (type) {
            case 'work':
                task.addTags('professional');
                if (task.meetingRequired) {
                    task.addTags('meeting');
                }
                break;
                
            case 'personal':
                task.addTags('self-care');
                if (task.healthImpact === 'positive') {
                    task.addTags('healthy');
                }
                break;
                
            case 'project':
                task.addTags('project-management');
                if (task.sprint) {
                    task.addTags(`sprint-${task.sprint}`);
                }
                break;
                
            case 'reminder':
                task.addTags(['reminder', 'notification']);
                task.priority = task.priority || 'low';
                break;
                
            case 'meeting':
                task.addTags(['meeting', 'collaboration']);
                task.meetingRequired = true;
                break;
                
            case 'goal':
                task.addTags(['goal', 'achievement', 'growth']);
                break;
        }

        // Set default due date for certain types
        if (['meeting', 'reminder'].includes(type) && !task.dueDate) {
            // Set default due date to tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            task.dueDate = tomorrow;
        }
    }

    /**
     * Create task with smart type detection
     * @param {Object} data - Task data
     * @returns {Task} Task instance with auto-detected type
     */
    static createWithAutoDetection(data) {
        if (data.type) {
            return this.createTask(data.type, data);
        }

        // Auto-detect type based on data properties
        const detectedType = this.detectTaskType(data);
        return this.createTask(detectedType, { ...data, type: detectedType });
    }

    /**
     * Auto-detect task type based on data
     * @param {Object} data - Task data
     * @returns {string} Detected task type
     */
    static detectTaskType(data) {
        // Check for work indicators
        if (data.projectName || data.clientName || data.billableHours || 
            data.department || data.meetingRequired) {
            return 'work';
        }

        // Check for project indicators
        if (data.projectId || data.milestone || data.dependencies || 
            data.storyPoints || data.sprint || data.assignees) {
            return 'project';
        }

        // Check for personal indicators
        if (data.category || data.energyLevel || data.motivationLevel || 
            data.rewardPlanned || data.healthImpact) {
            return 'personal';
        }

        // Check title/description keywords
        const text = `${data.title || ''} ${data.description || ''}`.toLowerCase();
        
        const workKeywords = ['meeting', 'client', 'project', 'deadline', 'presentation', 'report'];
        const personalKeywords = ['exercise', 'health', 'learn', 'hobby', 'family', 'personal'];
        const projectKeywords = ['develop', 'implement', 'design', 'test', 'deploy', 'feature'];

        const workScore = workKeywords.reduce((score, keyword) => 
            text.includes(keyword) ? score + 1 : score, 0);
        const personalScore = personalKeywords.reduce((score, keyword) => 
            text.includes(keyword) ? score + 1 : score, 0);
        const projectScore = projectKeywords.reduce((score, keyword) => 
            text.includes(keyword) ? score + 1 : score, 0);

        // Return type with highest score, default to personal
        if (workScore > personalScore && workScore > projectScore) {
            return 'work';
        } else if (projectScore > personalScore && projectScore > workScore) {
            return 'project';
        } else {
            return 'personal';
        }
    }

    /**
     * Get task creation statistics
     * @returns {Object} Creation statistics
     */
    static getCreationStats() {
        return {
            availableTypes: this.getAvailableTypes().length,
            registeredTypes: Object.keys(this.taskTypes),
            hasTemplates: Object.keys(this.taskTypes).filter(type => {
                const TaskClass = this.taskTypes[type];
                return TaskClass.getTemplate && typeof TaskClass.getTemplate === 'function';
            })
        };
    }

    /**
     * Validate task data before creation
     * @param {Object} data - Task data to validate
     * @returns {Object} Validation result
     */
    static validateTaskData(data) {
        const errors = [];
        const warnings = [];

        // Required fields
        if (!data.title || data.title.trim().length === 0) {
            errors.push('Title is required');
        }

        if (data.title && data.title.length > 200) {
            warnings.push('Title is very long (>200 characters)');
        }

        // Type validation
        if (data.type && !this.isValidType(data.type)) {
            errors.push(`Invalid task type: ${data.type}`);
        }

        // Priority validation
        if (data.priority && !['low', 'medium', 'high'].includes(data.priority)) {
            errors.push(`Invalid priority: ${data.priority}`);
        }

        // Due date validation
        if (data.dueDate) {
            const dueDate = new Date(data.dueDate);
            if (isNaN(dueDate.getTime())) {
                errors.push('Invalid due date format');
            } else if (dueDate < new Date()) {
                warnings.push('Due date is in the past');
            }
        }

        // Progress validation
        if (data.progress !== undefined && (data.progress < 0 || data.progress > 100)) {
            errors.push('Progress must be between 0 and 100');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get task templates for all types
     * @returns {Object} Available templates by type
     */
    static getAllTemplates() {
        const templates = {};
        
        Object.entries(this.taskTypes).forEach(([type, TaskClass]) => {
            if (TaskClass.getTemplate) {
                // Get common template names (this would be type-specific in real implementation)
                const commonTemplates = ['default', 'quick', 'detailed'];
                templates[type] = {};
                
                commonTemplates.forEach(templateName => {
                    try {
                        const template = TaskClass.getTemplate(templateName);
                        if (Object.keys(template).length > 0) {
                            templates[type][templateName] = template;
                        }
                    } catch (error) {
                        // Template doesn't exist, skip
                    }
                });
            }
        });
        
        return templates;
    }
}

export default TaskFactory;
