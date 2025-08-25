/**
 * Task.js - Base Task Model
 * 
 * Abstract base class for all task types using OOP inheritance principles.
 * Implements common properties and methods shared across all task types.
 */

export class Task {
    /**
     * Create a new Task instance
     * @param {Object} data - Task data
     * @param {string} data.title - Task title
     * @param {string} data.description - Task description
     * @param {string} data.type - Task type
     * @param {string} data.priority - Task priority (low, medium, high)
     * @param {string} data.status - Task status (pending, in-progress, completed, cancelled)
     */
    constructor(data = {}) {
        // Prevent direct instantiation of abstract base class
        if (this.constructor === Task) {
            throw new Error('Cannot instantiate abstract class Task directly');
        }

        // Core properties
        this.id = data.id || this.generateId();
        this.title = data.title || '';
        this.description = data.description || '';
        this.type = data.type || 'generic';
        this.priority = data.priority || 'medium';
        this.status = data.status || 'pending';

        // Temporal properties
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date();
        this.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        this.completedAt = data.completedAt ? new Date(data.completedAt) : null;

        // Progress and tracking
        this.progress = Math.max(0, Math.min(100, data.progress || 0));
        this.estimatedMinutes = data.estimatedMinutes || 0;
        this.actualMinutes = data.actualMinutes || 0;

        // Organization
        this.tags = Array.isArray(data.tags) ? [...data.tags] : [];
        this.notes = data.notes || '';
        
        // Metadata
        this.isRecurring = data.isRecurring || false;
        this.recurringPattern = data.recurringPattern || null;
        this.parentTaskId = data.parentTaskId || null;
        this.subtasks = data.subtasks || [];
        this.attachments = data.attachments || [];

        // Validation
        this.validateTask();
    }

    /**
     * Generate unique task ID
     * @returns {string} Unique ID
     */
    generateId() {
        const timestamp = Date.now().toString(36);
        const randomStr = Math.random().toString(36).substring(2, 8);
        return `task_${timestamp}_${randomStr}`;
    }

    /**
     * Validate task data
     * @throws {Error} If validation fails
     */
    validateTask() {
        if (!this.title || typeof this.title !== 'string' || this.title.trim().length === 0) {
            throw new Error('Task title is required and must be a non-empty string');
        }

        const validPriorities = ['low', 'medium', 'high'];
        if (!validPriorities.includes(this.priority)) {
            throw new Error(`Invalid priority: ${this.priority}. Must be one of: ${validPriorities.join(', ')}`);
        }

        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(this.status)) {
            throw new Error(`Invalid status: ${this.status}. Must be one of: ${validStatuses.join(', ')}`);
        }

        if (this.progress < 0 || this.progress > 100) {
            throw new Error('Progress must be between 0 and 100');
        }

        if (this.estimatedMinutes < 0 || this.actualMinutes < 0) {
            throw new Error('Time estimates cannot be negative');
        }
    }

    /**
     * Update task status
     * @param {string} newStatus - New status
     * @returns {Task} This instance for chaining
     */
    updateStatus(newStatus) {
        const oldStatus = this.status;
        this.status = newStatus;
        this.updatedAt = new Date();

        // Auto-update progress based on status
        switch (newStatus) {
            case 'completed':
                this.progress = 100;
                this.completedAt = new Date();
                break;
            case 'cancelled':
                this.completedAt = null;
                break;
            case 'in-progress':
                if (this.progress === 0) {
                    this.progress = 10; // Default start progress
                }
                break;
            case 'pending':
                this.completedAt = null;
                break;
        }

        this.validateTask();
        this.onStatusChanged(oldStatus, newStatus);
        return this;
    }

    /**
     * Update task progress
     * @param {number} progressPercent - Progress percentage (0-100)
     * @returns {Task} This instance for chaining
     */
    updateProgress(progressPercent) {
        const oldProgress = this.progress;
        this.progress = Math.max(0, Math.min(100, progressPercent));
        this.updatedAt = new Date();

        // Auto-update status based on progress
        if (this.progress === 100 && this.status !== 'completed') {
            this.updateStatus('completed');
        } else if (this.progress > 0 && this.progress < 100 && this.status === 'pending') {
            this.updateStatus('in-progress');
        } else if (this.progress === 0 && this.status === 'in-progress') {
            this.updateStatus('pending');
        }

        this.onProgressChanged(oldProgress, this.progress);
        return this;
    }

    /**
     * Add tag to task
     * @param {string|string[]} tags - Tag(s) to add
     * @returns {Task} This instance for chaining
     */
    addTags(tags) {
        const tagsToAdd = Array.isArray(tags) ? tags : [tags];
        const cleanTags = tagsToAdd
            .map(tag => tag.toString().trim().toLowerCase())
            .filter(tag => tag.length > 0 && !this.tags.includes(tag));
        
        this.tags.push(...cleanTags);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Remove tag from task
     * @param {string} tag - Tag to remove
     * @returns {Task} This instance for chaining
     */
    removeTag(tag) {
        const tagToRemove = tag.toString().trim().toLowerCase();
        this.tags = this.tags.filter(t => t !== tagToRemove);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Check if task has specific tag
     * @param {string} tag - Tag to check
     * @returns {boolean} True if task has the tag
     */
    hasTag(tag) {
        return this.tags.includes(tag.toString().trim().toLowerCase());
    }

    /**
     * Add subtask
     * @param {Task} subtask - Subtask to add
     * @returns {Task} This instance for chaining
     */
    addSubtask(subtask) {
        if (!(subtask instanceof Task)) {
            throw new Error('Subtask must be an instance of Task');
        }

        subtask.parentTaskId = this.id;
        this.subtasks.push(subtask.id);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Calculate completion percentage based on subtasks
     * @returns {number} Completion percentage
     */
    calculateSubtaskCompletion() {
        if (this.subtasks.length === 0) {
            return this.progress;
        }

        // This would need access to TaskRepository to get actual subtasks
        // For now, return current progress
        return this.progress;
    }

    /**
     * Check if task is overdue
     * @returns {boolean} True if task is overdue
     */
    isOverdue() {
        if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
            return false;
        }
        return new Date() > this.dueDate;
    }

    /**
     * Get time until due date
     * @returns {number|null} Minutes until due date, or null if no due date
     */
    getTimeUntilDue() {
        if (!this.dueDate) {
            return null;
        }
        const now = new Date();
        const timeDiff = this.dueDate.getTime() - now.getTime();
        return Math.floor(timeDiff / (1000 * 60));
    }

    /**
     * Check if task is due today
     * @returns {boolean} True if due today
     */
    isDueToday() {
        if (!this.dueDate) {
            return false;
        }
        const today = new Date();
        const due = new Date(this.dueDate);
        return (
            today.getFullYear() === due.getFullYear() &&
            today.getMonth() === due.getMonth() &&
            today.getDate() === due.getDate()
        );
    }

    /**
     * Get task age in days
     * @returns {number} Age in days
     */
    getAgeInDays() {
        const now = new Date();
        const timeDiff = now.getTime() - this.createdAt.getTime();
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    }

    /**
     * Get priority weight for sorting
     * @returns {number} Priority weight (higher = more important)
     */
    getPriorityWeight() {
        const weights = { low: 1, medium: 2, high: 3 };
        return weights[this.priority] || 2;
    }

    /**
     * Create a deep copy of the task
     * @returns {Task} Deep copy of this task
     */
    clone() {
        const clonedData = {
            ...this.toObject(),
            id: this.generateId(), // Generate new ID for clone
            createdAt: new Date()
        };
        return new this.constructor(clonedData);
    }

    /**
     * Convert task to plain object for serialization
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            type: this.type,
            priority: this.priority,
            status: this.status,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            dueDate: this.dueDate ? this.dueDate.toISOString() : null,
            completedAt: this.completedAt ? this.completedAt.toISOString() : null,
            progress: this.progress,
            estimatedMinutes: this.estimatedMinutes,
            actualMinutes: this.actualMinutes,
            tags: [...this.tags],
            notes: this.notes,
            isRecurring: this.isRecurring,
            recurringPattern: this.recurringPattern,
            parentTaskId: this.parentTaskId,
            subtasks: [...this.subtasks],
            attachments: [...this.attachments]
        };
    }

    /**
     * Convert task to JSON string
     * @returns {string} JSON representation
     */
    toJSON() {
        return JSON.stringify(this.toObject(), null, 2);
    }

    /**
     * Hook method called when status changes
     * Override in subclasses for specific behavior
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
    onStatusChanged(oldStatus, newStatus) {
        // Override in subclasses
    }

    /**
     * Hook method called when progress changes
     * Override in subclasses for specific behavior
     * @param {number} oldProgress - Previous progress
     * @param {number} newProgress - New progress
     */
    onProgressChanged(oldProgress, newProgress) {
        // Override in subclasses
    }

    /**
     * Abstract method to get task-specific display properties
     * Must be implemented by subclasses
     * @returns {Object} Display properties
     */
    getDisplayProperties() {
        throw new Error('getDisplayProperties() must be implemented by subclasses');
    }

    /**
     * Abstract method to validate task-specific data
     * Must be implemented by subclasses
     */
    validateTypeSpecificData() {
        throw new Error('validateTypeSpecificData() must be implemented by subclasses');
    }

    /**
     * Get human-readable string representation
     * @returns {string} String representation
     */
    toString() {
        return `${this.constructor.name}(id=${this.id}, title="${this.title}", status=${this.status}, priority=${this.priority})`;
    }
}

export default Task;
