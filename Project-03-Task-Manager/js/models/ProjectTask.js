/**
 * ProjectTask.js - Project Task Model
 * 
 * Specialized task class for project-related tasks.
 * Extends base Task with project management properties and behavior.
 */

import { Task } from './Task.js';

export class ProjectTask extends Task {
    /**
     * Create a new ProjectTask instance
     * @param {Object} data - Task data
     */
    constructor(data = {}) {
        super({ ...data, type: 'project' });
        
        // Project-specific properties
        this.projectId = data.projectId || '';
        this.projectName = data.projectName || '';
        this.milestone = data.milestone || '';
        this.phase = data.phase || 'planning'; // planning, design, development, testing, deployment, maintenance
        this.dependencies = data.dependencies || []; // Array of task IDs this task depends on
        this.dependents = data.dependents || []; // Array of task IDs that depend on this task
        this.assignees = data.assignees || []; // Array of assigned team members
        this.reviewers = data.reviewers || []; // Array of reviewers
        this.deliverables = data.deliverables || []; // Array of expected deliverables
        this.risks = data.risks || []; // Array of identified risks
        this.blockers = data.blockers || []; // Array of current blockers
        this.resources = data.resources || []; // Required resources
        this.budget = data.budget || 0;
        this.actualCost = data.actualCost || 0;
        this.storyPoints = data.storyPoints || 0; // Agile story points
        this.epic = data.epic || ''; // Epic this task belongs to
        this.sprint = data.sprint || ''; // Sprint assignment
        this.isBlocked = data.isBlocked || false;
        this.blockingReason = data.blockingReason || '';
        this.definition_of_done = data.definition_of_done || [];
        this.acceptance_criteria = data.acceptance_criteria || [];
        
        // Project validation
        this.validateTypeSpecificData();
    }

    /**
     * Validate project-specific data
     * @throws {Error} If validation fails
     */
    validateTypeSpecificData() {
        const validPhases = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];
        if (!validPhases.includes(this.phase)) {
            throw new Error(`Invalid phase: ${this.phase}. Must be one of: ${validPhases.join(', ')}`);
        }

        if (this.budget < 0 || this.actualCost < 0) {
            throw new Error('Budget and actual cost cannot be negative');
        }

        if (this.storyPoints < 0) {
            throw new Error('Story points cannot be negative');
        }

        // Validate dependencies are not circular
        if (this.dependencies.includes(this.id)) {
            throw new Error('Task cannot depend on itself');
        }
    }

    /**
     * Add dependency to this task
     * @param {string} taskId - ID of the task this depends on
     * @returns {ProjectTask} This instance for chaining
     */
    addDependency(taskId) {
        if (taskId === this.id) {
            throw new Error('Task cannot depend on itself');
        }
        
        if (!this.dependencies.includes(taskId)) {
            this.dependencies.push(taskId);
            this.updatedAt = new Date();
        }
        
        return this;
    }

    /**
     * Remove dependency from this task
     * @param {string} taskId - ID of the dependency to remove
     * @returns {ProjectTask} This instance for chaining
     */
    removeDependency(taskId) {
        this.dependencies = this.dependencies.filter(dep => dep !== taskId);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Add team member assignment
     * @param {string} assignee - Team member to assign
     * @returns {ProjectTask} This instance for chaining
     */
    assignTo(assignee) {
        if (!this.assignees.includes(assignee)) {
            this.assignees.push(assignee);
            this.updatedAt = new Date();
            this.addTags(`assigned-to-${assignee.toLowerCase().replace(/\s+/g, '-')}`);
        }
        return this;
    }

    /**
     * Remove team member assignment
     * @param {string} assignee - Team member to unassign
     * @returns {ProjectTask} This instance for chaining
     */
    unassign(assignee) {
        this.assignees = this.assignees.filter(a => a !== assignee);
        this.removeTag(`assigned-to-${assignee.toLowerCase().replace(/\s+/g, '-')}`);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Add deliverable to the task
     * @param {string} deliverable - Deliverable description
     * @returns {ProjectTask} This instance for chaining
     */
    addDeliverable(deliverable) {
        if (!this.deliverables.includes(deliverable)) {
            this.deliverables.push(deliverable);
            this.updatedAt = new Date();
        }
        return this;
    }

    /**
     * Add risk to the task
     * @param {string} risk - Risk description
     * @param {string} severity - Risk severity (low, medium, high, critical)
     * @returns {ProjectTask} This instance for chaining
     */
    addRisk(risk, severity = 'medium') {
        const riskObject = {
            description: risk,
            severity: severity,
            identified: new Date().toISOString(),
            mitigated: false
        };
        
        this.risks.push(riskObject);
        
        // Auto-adjust priority based on risk severity
        if (severity === 'critical' || severity === 'high') {
            this.priority = 'high';
        }
        
        this.addTags(`risk-${severity}`);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Mark risk as mitigated
     * @param {number} riskIndex - Index of risk in risks array
     * @returns {ProjectTask} This instance for chaining
     */
    mitigateRisk(riskIndex) {
        if (this.risks[riskIndex]) {
            this.risks[riskIndex].mitigated = true;
            this.risks[riskIndex].mitigatedDate = new Date().toISOString();
            this.updatedAt = new Date();
        }
        return this;
    }

    /**
     * Add blocker to the task
     * @param {string} blocker - Blocker description
     * @param {string} severity - Blocker severity
     * @returns {ProjectTask} This instance for chaining
     */
    addBlocker(blocker, severity = 'medium') {
        const blockerObject = {
            description: blocker,
            severity: severity,
            added: new Date().toISOString(),
            resolved: false
        };
        
        this.blockers.push(blockerObject);
        this.isBlocked = true;
        this.blockingReason = blocker;
        
        // Blocked tasks should not be in progress
        if (this.status === 'in-progress') {
            this.updateStatus('pending');
        }
        
        this.addTags(['blocked', `blocker-${severity}`]);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Resolve blocker
     * @param {number} blockerIndex - Index of blocker in blockers array
     * @returns {ProjectTask} This instance for chaining
     */
    resolveBlocker(blockerIndex) {
        if (this.blockers[blockerIndex]) {
            this.blockers[blockerIndex].resolved = true;
            this.blockers[blockerIndex].resolvedDate = new Date().toISOString();
            
            // Check if all blockers are resolved
            const unresolvedBlockers = this.blockers.filter(b => !b.resolved);
            if (unresolvedBlockers.length === 0) {
                this.isBlocked = false;
                this.blockingReason = '';
                this.removeTag('blocked');
            }
            
            this.updatedAt = new Date();
        }
        return this;
    }

    /**
     * Set project phase
     * @param {string} phase - Project phase
     * @returns {ProjectTask} This instance for chaining
     */
    setPhase(phase) {
        this.phase = phase;
        this.addTags(`phase-${phase}`);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Assign to sprint
     * @param {string} sprint - Sprint name/number
     * @returns {ProjectTask} This instance for chaining
     */
    assignToSprint(sprint) {
        this.sprint = sprint;
        this.addTags(`sprint-${sprint.toString().toLowerCase().replace(/\s+/g, '-')}`);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Set story points
     * @param {number} points - Story points
     * @returns {ProjectTask} This instance for chaining
     */
    setStoryPoints(points) {
        this.storyPoints = Math.max(0, points);
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Add acceptance criteria
     * @param {string} criteria - Acceptance criteria
     * @returns {ProjectTask} This instance for chaining
     */
    addAcceptanceCriteria(criteria) {
        if (!this.acceptance_criteria.includes(criteria)) {
            this.acceptance_criteria.push(criteria);
            this.updatedAt = new Date();
        }
        return this;
    }

    /**
     * Check if all dependencies are completed
     * @param {Array} allTasks - Array of all tasks to check dependencies
     * @returns {boolean} True if all dependencies are completed
     */
    areDependenciesCompleted(allTasks = []) {
        if (this.dependencies.length === 0) {
            return true;
        }
        
        return this.dependencies.every(depId => {
            const dependentTask = allTasks.find(task => task.id === depId);
            return dependentTask && dependentTask.status === 'completed';
        });
    }

    /**
     * Check if task can start based on dependencies and blockers
     * @param {Array} allTasks - Array of all tasks
     * @returns {Object} Readiness analysis
     */
    checkReadiness(allTasks = []) {
        const analysis = {
            canStart: true,
            reasons: [],
            suggestions: []
        };

        // Check dependencies
        if (!this.areDependenciesCompleted(allTasks)) {
            analysis.canStart = false;
            analysis.reasons.push('Has incomplete dependencies');
            analysis.suggestions.push('Wait for dependent tasks to complete');
        }

        // Check blockers
        if (this.isBlocked) {
            analysis.canStart = false;
            analysis.reasons.push(`Blocked: ${this.blockingReason}`);
            analysis.suggestions.push('Resolve blocking issues first');
        }

        // Check assignees
        if (this.assignees.length === 0) {
            analysis.canStart = false;
            analysis.reasons.push('No assignees specified');
            analysis.suggestions.push('Assign team members to this task');
        }

        // Check resources
        const missingResources = this.resources.filter(resource => !resource.available);
        if (missingResources.length > 0) {
            analysis.canStart = false;
            analysis.reasons.push(`Missing resources: ${missingResources.map(r => r.name).join(', ')}`);
            analysis.suggestions.push('Secure required resources');
        }

        return analysis;
    }

    /**
     * Calculate project velocity (story points / estimated time)
     * @returns {number} Velocity score
     */
    calculateVelocity() {
        if (this.estimatedMinutes === 0) {
            return 0;
        }
        return this.storyPoints / (this.estimatedMinutes / 60); // Points per hour
    }

    /**
     * Get project health score
     * @returns {Object} Health analysis
     */
    getHealthScore() {
        let score = 100;
        const issues = [];

        // Check for overdue
        if (this.isOverdue()) {
            score -= 20;
            issues.push('Overdue');
        }

        // Check for blockers
        if (this.isBlocked) {
            score -= 15;
            issues.push('Blocked');
        }

        // Check for high-risk items
        const highRisks = this.risks.filter(risk => 
            ['high', 'critical'].includes(risk.severity) && !risk.mitigated
        );
        if (highRisks.length > 0) {
            score -= highRisks.length * 10;
            issues.push(`${highRisks.length} high risks`);
        }

        // Check for over budget
        if (this.actualCost > this.budget && this.budget > 0) {
            score -= 15;
            issues.push('Over budget');
        }

        // Check for lack of progress
        if (this.status === 'in-progress' && this.progress < 10 && this.getAgeInDays() > 7) {
            score -= 10;
            issues.push('No progress');
        }

        return {
            score: Math.max(0, score),
            health: score >= 80 ? 'good' : score >= 60 ? 'fair' : 'poor',
            issues
        };
    }

    /**
     * Get display properties specific to project tasks
     * @returns {Object} Display properties
     */
    getDisplayProperties() {
        const phaseIcons = {
            planning: '📋',
            design: '🎨',
            development: '💻',
            testing: '🧪',
            deployment: '🚀',
            maintenance: '🔧'
        };

        const healthScore = this.getHealthScore();

        return {
            icon: phaseIcons[this.phase] || '📂',
            color: this.isBlocked ? '#ef4444' : healthScore.score >= 80 ? '#10b981' : '#f59e0b',
            badge: this.isBlocked ? 'Blocked' : this.sprint ? `Sprint ${this.sprint}` : null,
            metadata: [
                this.projectName && `📂 ${this.projectName}`,
                this.milestone && `🎯 ${this.milestone}`,
                this.phase && `📋 ${this.phase}`,
                this.assignees.length > 0 && `👥 ${this.assignees.length} assigned`,
                this.storyPoints > 0 && `📊 ${this.storyPoints} pts`,
                this.dependencies.length > 0 && `🔗 ${this.dependencies.length} deps`,
                this.isBlocked && '🚫 Blocked'
            ].filter(Boolean),
            urgencyIndicator: this.isBlocked || healthScore.health === 'poor' ? 'high' : 'normal',
            healthScore: healthScore.score
        };
    }

    /**
     * Hook method called when status changes
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
    onStatusChanged(oldStatus, newStatus) {
        super.onStatusChanged(oldStatus, newStatus);
        
        // Project-specific status change logic
        if (newStatus === 'in-progress' && this.isBlocked) {
            throw new Error('Cannot start blocked project task');
        }
        
        if (newStatus === 'completed') {
            // Mark all acceptance criteria as met
            this.acceptance_criteria.forEach((criteria, index) => {
                this.acceptance_criteria[index] = `✓ ${criteria}`;
            });
            
            // Add project completion tags
            this.addTags(['project-completed', `${this.phase}-complete`]);
        }
    }

    /**
     * Convert to object with project-specific properties
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            ...super.toObject(),
            projectId: this.projectId,
            projectName: this.projectName,
            milestone: this.milestone,
            phase: this.phase,
            dependencies: [...this.dependencies],
            dependents: [...this.dependents],
            assignees: [...this.assignees],
            reviewers: [...this.reviewers],
            deliverables: [...this.deliverables],
            risks: [...this.risks],
            blockers: [...this.blockers],
            resources: [...this.resources],
            budget: this.budget,
            actualCost: this.actualCost,
            storyPoints: this.storyPoints,
            epic: this.epic,
            sprint: this.sprint,
            isBlocked: this.isBlocked,
            blockingReason: this.blockingReason,
            definition_of_done: [...this.definition_of_done],
            acceptance_criteria: [...this.acceptance_criteria]
        };
    }

    /**
     * Create project task from plain object
     * @param {Object} obj - Plain object
     * @returns {ProjectTask} ProjectTask instance
     */
    static fromObject(obj) {
        return new ProjectTask(obj);
    }

    /**
     * Get project task template for common project types
     * @param {string} projectType - Type of project task
     * @returns {Object} Template data
     */
    static getTemplate(projectType) {
        const templates = {
            'feature': {
                title: 'New Feature Development',
                description: 'Develop and implement new feature',
                phase: 'development',
                storyPoints: 5,
                estimatedMinutes: 480,
                tags: ['feature', 'development'],
                acceptance_criteria: [
                    'Feature meets requirements',
                    'Unit tests written and passing',
                    'Code reviewed and approved'
                ]
            },
            'bug-fix': {
                title: 'Bug Fix',
                description: 'Investigate and fix reported bug',
                phase: 'development',
                priority: 'high',
                storyPoints: 2,
                estimatedMinutes: 120,
                tags: ['bug', 'fix', 'maintenance']
            },
            'research': {
                title: 'Research Task',
                description: 'Research and analyze technical solution',
                phase: 'planning',
                storyPoints: 3,
                estimatedMinutes: 240,
                tags: ['research', 'analysis', 'planning']
            },
            'deployment': {
                title: 'Deployment Task',
                description: 'Deploy application to production environment',
                phase: 'deployment',
                priority: 'high',
                storyPoints: 1,
                estimatedMinutes: 60,
                tags: ['deployment', 'production', 'release']
            }
        };

        return templates[projectType] || {};
    }
}

export default ProjectTask;
