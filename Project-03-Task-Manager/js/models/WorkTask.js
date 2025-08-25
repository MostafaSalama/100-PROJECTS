/**
 * WorkTask.js - Work Task Model
 * 
 * Specialized task class for work-related tasks.
 * Extends base Task with work-specific properties and behavior.
 */

import { Task } from './Task.js';

export class WorkTask extends Task {
    /**
     * Create a new WorkTask instance
     * @param {Object} data - Task data
     */
    constructor(data = {}) {
        super({ ...data, type: 'work' });
        
        // Work-specific properties
        this.projectName = data.projectName || '';
        this.clientName = data.clientName || '';
        this.department = data.department || '';
        this.assignedTo = data.assignedTo || '';
        this.billableHours = data.billableHours || 0;
        this.hourlyRate = data.hourlyRate || 0;
        this.budgetCode = data.budgetCode || '';
        this.meetingRequired = data.meetingRequired || false;
        this.requiresApproval = data.requiresApproval || false;
        this.approvedBy = data.approvedBy || '';
        this.workLocation = data.workLocation || 'office'; // office, remote, client-site
        
        // Work-specific validation
        this.validateTypeSpecificData();
    }

    /**
     * Validate work-specific data
     * @throws {Error} If validation fails
     */
    validateTypeSpecificData() {
        if (this.billableHours < 0) {
            throw new Error('Billable hours cannot be negative');
        }
        
        if (this.hourlyRate < 0) {
            throw new Error('Hourly rate cannot be negative');
        }

        const validLocations = ['office', 'remote', 'client-site', 'hybrid'];
        if (!validLocations.includes(this.workLocation)) {
            throw new Error(`Invalid work location: ${this.workLocation}`);
        }
    }

    /**
     * Calculate total billable amount
     * @returns {number} Total billable amount
     */
    calculateBillableAmount() {
        return this.billableHours * this.hourlyRate;
    }

    /**
     * Mark task as requiring approval
     * @param {boolean} required - Whether approval is required
     * @returns {WorkTask} This instance for chaining
     */
    setApprovalRequired(required = true) {
        this.requiresApproval = required;
        this.updatedAt = new Date();
        
        if (required && this.status === 'completed') {
            // If approval is now required, move back to in-progress
            this.updateStatus('in-progress');
        }
        
        return this;
    }

    /**
     * Approve the work task
     * @param {string} approverName - Name of the approver
     * @returns {WorkTask} This instance for chaining
     */
    approve(approverName) {
        if (!this.requiresApproval) {
            throw new Error('This task does not require approval');
        }
        
        this.approvedBy = approverName;
        this.updatedAt = new Date();
        
        // Auto-complete if progress is 100%
        if (this.progress === 100) {
            this.updateStatus('completed');
        }
        
        return this;
    }

    /**
     * Check if task is approved
     * @returns {boolean} True if approved or doesn't require approval
     */
    isApproved() {
        if (!this.requiresApproval) {
            return true;
        }
        return Boolean(this.approvedBy);
    }

    /**
     * Set project and client information
     * @param {string} projectName - Project name
     * @param {string} clientName - Client name
     * @returns {WorkTask} This instance for chaining
     */
    setProjectInfo(projectName, clientName = '') {
        this.projectName = projectName;
        this.clientName = clientName;
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Log billable time
     * @param {number} hours - Hours to add
     * @param {string} description - Description of work done
     * @returns {WorkTask} This instance for chaining
     */
    logBillableTime(hours, description = '') {
        if (hours <= 0) {
            throw new Error('Billable hours must be positive');
        }
        
        this.billableHours += hours;
        this.actualMinutes += (hours * 60);
        
        if (description) {
            const timeLogEntry = `${new Date().toISOString()}: ${hours}h - ${description}`;
            this.notes += (this.notes ? '\n' : '') + timeLogEntry;
        }
        
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Get work efficiency ratio
     * @returns {number} Ratio of estimated to actual time
     */
    getEfficiencyRatio() {
        if (this.estimatedMinutes === 0 || this.actualMinutes === 0) {
            return 1;
        }
        return this.estimatedMinutes / this.actualMinutes;
    }

    /**
     * Check if task is over budget (time-wise)
     * @returns {boolean} True if over estimated time
     */
    isOverBudget() {
        return this.actualMinutes > this.estimatedMinutes && this.estimatedMinutes > 0;
    }

    /**
     * Get display properties specific to work tasks
     * @returns {Object} Display properties
     */
    getDisplayProperties() {
        return {
            icon: '🏢',
            color: '#2563eb', // Blue
            badge: this.requiresApproval ? (this.isApproved() ? 'Approved' : 'Needs Approval') : null,
            metadata: [
                this.projectName && `📂 ${this.projectName}`,
                this.clientName && `👤 ${this.clientName}`,
                this.department && `🏛️ ${this.department}`,
                this.billableHours > 0 && `💰 ${this.billableHours}h billable`,
                this.workLocation !== 'office' && `📍 ${this.workLocation}`
            ].filter(Boolean),
            urgencyIndicator: this.requiresApproval && !this.isApproved() ? 'high' : 'normal'
        };
    }

    /**
     * Hook method called when status changes
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
    onStatusChanged(oldStatus, newStatus) {
        super.onStatusChanged(oldStatus, newStatus);
        
        // Work-specific status change logic
        if (newStatus === 'completed' && this.requiresApproval && !this.isApproved()) {
            throw new Error('Cannot complete work task without approval');
        }
        
        // Auto-tag based on status for work tasks
        if (newStatus === 'completed') {
            this.addTags('completed-work');
        } else if (newStatus === 'in-progress') {
            this.addTags('active-work');
        }
    }

    /**
     * Convert to object with work-specific properties
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            ...super.toObject(),
            projectName: this.projectName,
            clientName: this.clientName,
            department: this.department,
            assignedTo: this.assignedTo,
            billableHours: this.billableHours,
            hourlyRate: this.hourlyRate,
            budgetCode: this.budgetCode,
            meetingRequired: this.meetingRequired,
            requiresApproval: this.requiresApproval,
            approvedBy: this.approvedBy,
            workLocation: this.workLocation
        };
    }

    /**
     * Create work task from plain object
     * @param {Object} obj - Plain object
     * @returns {WorkTask} WorkTask instance
     */
    static fromObject(obj) {
        return new WorkTask(obj);
    }

    /**
     * Get work task template for common work types
     * @param {string} workType - Type of work task
     * @returns {Object} Template data
     */
    static getTemplate(workType) {
        const templates = {
            'meeting': {
                title: 'Team Meeting',
                description: 'Weekly team sync meeting',
                estimatedMinutes: 60,
                meetingRequired: true,
                tags: ['meeting', 'team']
            },
            'development': {
                title: 'Development Task',
                description: 'Code development and implementation',
                estimatedMinutes: 240,
                tags: ['development', 'coding']
            },
            'review': {
                title: 'Code Review',
                description: 'Review team member\'s code',
                estimatedMinutes: 30,
                requiresApproval: true,
                tags: ['review', 'quality-assurance']
            },
            'deployment': {
                title: 'Deployment Task',
                description: 'Deploy application to production',
                estimatedMinutes: 120,
                requiresApproval: true,
                tags: ['deployment', 'production']
            },
            'client-call': {
                title: 'Client Call',
                description: 'Call with client to discuss project',
                estimatedMinutes: 30,
                meetingRequired: true,
                workLocation: 'remote',
                tags: ['client', 'call', 'meeting']
            }
        };

        return templates[workType] || {};
    }
}

export default WorkTask;
