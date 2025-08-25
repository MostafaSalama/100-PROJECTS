/**
 * PersonalTask.js - Personal Task Model
 * 
 * Specialized task class for personal tasks.
 * Extends base Task with personal-specific properties and behavior.
 */

import { Task } from './Task.js';

export class PersonalTask extends Task {
    /**
     * Create a new PersonalTask instance
     * @param {Object} data - Task data
     */
    constructor(data = {}) {
        super({ ...data, type: 'personal' });
        
        // Personal-specific properties
        this.category = data.category || 'general'; // health, finance, learning, household, social, hobby
        this.energyLevel = data.energyLevel || 'medium'; // low, medium, high
        this.mood = data.mood || null;
        this.location = data.location || 'home';
        this.weatherDependent = data.weatherDependent || false;
        this.requiresTools = data.requiresTools || [];
        this.motivationLevel = data.motivationLevel || 5; // 1-10 scale
        this.rewardPlanned = data.rewardPlanned || '';
        this.privacyLevel = data.privacyLevel || 'private'; // private, family, friends, public
        this.linkedHabit = data.linkedHabit || '';
        this.healthImpact = data.healthImpact || 'neutral'; // positive, negative, neutral
        
        // Personal validation
        this.validateTypeSpecificData();
    }

    /**
     * Validate personal-specific data
     * @throws {Error} If validation fails
     */
    validateTypeSpecificData() {
        const validCategories = ['general', 'health', 'finance', 'learning', 'household', 'social', 'hobby'];
        if (!validCategories.includes(this.category)) {
            throw new Error(`Invalid category: ${this.category}. Must be one of: ${validCategories.join(', ')}`);
        }

        const validEnergyLevels = ['low', 'medium', 'high'];
        if (!validEnergyLevels.includes(this.energyLevel)) {
            throw new Error(`Invalid energy level: ${this.energyLevel}`);
        }

        if (this.motivationLevel < 1 || this.motivationLevel > 10) {
            throw new Error('Motivation level must be between 1 and 10');
        }

        const validPrivacyLevels = ['private', 'family', 'friends', 'public'];
        if (!validPrivacyLevels.includes(this.privacyLevel)) {
            throw new Error(`Invalid privacy level: ${this.privacyLevel}`);
        }

        const validHealthImpacts = ['positive', 'negative', 'neutral'];
        if (!validHealthImpacts.includes(this.healthImpact)) {
            throw new Error(`Invalid health impact: ${this.healthImpact}`);
        }
    }

    /**
     * Set personal category
     * @param {string} category - Personal category
     * @returns {PersonalTask} This instance for chaining
     */
    setCategory(category) {
        this.category = category;
        this.updatedAt = new Date();
        
        // Auto-add category-specific tags
        this.addTags(category);
        
        // Auto-adjust priority based on category
        if (category === 'health') {
            this.priority = 'high';
        }
        
        return this;
    }

    /**
     * Set energy requirement for the task
     * @param {string} energyLevel - Required energy level
     * @returns {PersonalTask} This instance for chaining
     */
    setEnergyLevel(energyLevel) {
        this.energyLevel = energyLevel;
        this.updatedAt = new Date();
        
        // Add energy-related tag
        this.addTags(`${energyLevel}-energy`);
        
        return this;
    }

    /**
     * Set motivation level
     * @param {number} level - Motivation level (1-10)
     * @returns {PersonalTask} This instance for chaining
     */
    setMotivationLevel(level) {
        this.motivationLevel = Math.max(1, Math.min(10, level));
        this.updatedAt = new Date();
        
        // Auto-adjust priority based on motivation
        if (this.motivationLevel >= 8) {
            this.priority = 'high';
        } else if (this.motivationLevel <= 3) {
            this.addTags('low-motivation');
        }
        
        return this;
    }

    /**
     * Set a reward for completing the task
     * @param {string} reward - Reward description
     * @returns {PersonalTask} This instance for chaining
     */
    setReward(reward) {
        this.rewardPlanned = reward;
        this.motivationLevel = Math.min(10, this.motivationLevel + 1);
        this.addTags('has-reward');
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Add required tools or materials
     * @param {string|string[]} tools - Tools required
     * @returns {PersonalTask} This instance for chaining
     */
    addRequiredTools(tools) {
        const toolsToAdd = Array.isArray(tools) ? tools : [tools];
        this.requiresTools.push(...toolsToAdd);
        this.addTags('requires-tools');
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Check if task can be done based on current conditions
     * @param {Object} conditions - Current conditions
     * @param {string} conditions.weather - Current weather
     * @param {string} conditions.location - Current location
     * @param {string} conditions.energy - Current energy level
     * @returns {Object} Feasibility analysis
     */
    checkFeasibility(conditions = {}) {
        const analysis = {
            canDo: true,
            reasons: [],
            suggestions: []
        };

        // Weather check
        if (this.weatherDependent && conditions.weather) {
            if (this.hasTag('outdoor') && ['rain', 'storm', 'snow'].includes(conditions.weather)) {
                analysis.canDo = false;
                analysis.reasons.push('Weather conditions not suitable for outdoor activity');
                analysis.suggestions.push('Wait for better weather or find indoor alternative');
            }
        }

        // Location check
        if (this.location !== 'anywhere' && conditions.location && this.location !== conditions.location) {
            analysis.canDo = false;
            analysis.reasons.push(`Task requires being at: ${this.location}, currently at: ${conditions.location}`);
            analysis.suggestions.push(`Move to ${this.location} or reschedule task`);
        }

        // Energy level check
        if (conditions.energy && this.energyLevel === 'high' && ['low', 'tired'].includes(conditions.energy)) {
            analysis.canDo = false;
            analysis.reasons.push('Task requires high energy, but current energy is low');
            analysis.suggestions.push('Rest first, or choose a lower energy task');
        }

        // Tools check
        if (this.requiresTools.length > 0 && conditions.availableTools) {
            const missingTools = this.requiresTools.filter(tool => !conditions.availableTools.includes(tool));
            if (missingTools.length > 0) {
                analysis.canDo = false;
                analysis.reasons.push(`Missing required tools: ${missingTools.join(', ')}`);
                analysis.suggestions.push('Gather required tools before starting');
            }
        }

        return analysis;
    }

    /**
     * Check if task contributes to a healthy lifestyle
     * @returns {boolean} True if task has positive health impact
     */
    isHealthy() {
        return this.healthImpact === 'positive' || 
               this.category === 'health' || 
               this.hasTag('exercise') || 
               this.hasTag('wellness');
    }

    /**
     * Get suggested time slots based on task characteristics
     * @returns {string[]} Suggested time slots
     */
    getSuggestedTimeSlots() {
        const suggestions = [];

        if (this.energyLevel === 'high') {
            suggestions.push('morning', 'early-afternoon');
        } else if (this.energyLevel === 'low') {
            suggestions.push('evening', 'late-evening');
        }

        if (this.category === 'health' && this.hasTag('exercise')) {
            suggestions.push('morning', 'late-afternoon');
        }

        if (this.category === 'learning') {
            suggestions.push('morning', 'afternoon');
        }

        if (this.category === 'social') {
            suggestions.push('afternoon', 'evening', 'weekend');
        }

        if (this.category === 'household') {
            suggestions.push('weekend', 'evening');
        }

        return [...new Set(suggestions)]; // Remove duplicates
    }

    /**
     * Get display properties specific to personal tasks
     * @returns {Object} Display properties
     */
    getDisplayProperties() {
        const categoryIcons = {
            health: '💪',
            finance: '💰',
            learning: '📚',
            household: '🏠',
            social: '👥',
            hobby: '🎨',
            general: '📝'
        };

        const energyColors = {
            low: '#10b981', // Green for relaxed tasks
            medium: '#f59e0b', // Amber for moderate tasks
            high: '#ef4444' // Red for high energy tasks
        };

        return {
            icon: categoryIcons[this.category] || '📝',
            color: energyColors[this.energyLevel] || '#6b7280',
            badge: this.rewardPlanned ? '🎁 Reward' : null,
            metadata: [
                `⚡ ${this.energyLevel} energy`,
                `📍 ${this.location}`,
                this.motivationLevel >= 8 && '🔥 High motivation',
                this.requiresTools.length > 0 && `🛠️ Needs tools`,
                this.weatherDependent && '🌤️ Weather dependent',
                this.linkedHabit && `🔗 ${this.linkedHabit}`
            ].filter(Boolean),
            urgencyIndicator: this.category === 'health' ? 'high' : 'normal'
        };
    }

    /**
     * Hook method called when status changes
     * @param {string} oldStatus - Previous status
     * @param {string} newStatus - New status
     */
    onStatusChanged(oldStatus, newStatus) {
        super.onStatusChanged(oldStatus, newStatus);
        
        // Personal task specific behavior
        if (newStatus === 'completed') {
            // Boost motivation for future tasks
            this.motivationLevel = Math.min(10, this.motivationLevel + 1);
            
            // Add completion tags
            this.addTags(['personal-win', `${this.category}-completed`]);
            
            // Log reward earned
            if (this.rewardPlanned) {
                this.notes += `\n🎁 Reward earned: ${this.rewardPlanned}`;
            }
        }
    }

    /**
     * Convert to object with personal-specific properties
     * @returns {Object} Plain object representation
     */
    toObject() {
        return {
            ...super.toObject(),
            category: this.category,
            energyLevel: this.energyLevel,
            mood: this.mood,
            location: this.location,
            weatherDependent: this.weatherDependent,
            requiresTools: [...this.requiresTools],
            motivationLevel: this.motivationLevel,
            rewardPlanned: this.rewardPlanned,
            privacyLevel: this.privacyLevel,
            linkedHabit: this.linkedHabit,
            healthImpact: this.healthImpact
        };
    }

    /**
     * Create personal task from plain object
     * @param {Object} obj - Plain object
     * @returns {PersonalTask} PersonalTask instance
     */
    static fromObject(obj) {
        return new PersonalTask(obj);
    }

    /**
     * Get personal task template for common personal activities
     * @param {string} personalType - Type of personal task
     * @returns {Object} Template data
     */
    static getTemplate(personalType) {
        const templates = {
            'exercise': {
                title: 'Daily Exercise',
                description: '30 minutes of physical activity',
                category: 'health',
                energyLevel: 'high',
                estimatedMinutes: 30,
                healthImpact: 'positive',
                tags: ['exercise', 'daily', 'health'],
                location: 'gym'
            },
            'meditation': {
                title: 'Meditation Session',
                description: '10 minutes of mindfulness meditation',
                category: 'health',
                energyLevel: 'low',
                estimatedMinutes: 10,
                healthImpact: 'positive',
                tags: ['meditation', 'mindfulness', 'daily'],
                location: 'home'
            },
            'learning': {
                title: 'Learning Session',
                description: 'Study or learn something new',
                category: 'learning',
                energyLevel: 'medium',
                estimatedMinutes: 60,
                tags: ['learning', 'growth', 'skill'],
                location: 'home'
            },
            'household': {
                title: 'Household Chore',
                description: 'General household maintenance task',
                category: 'household',
                energyLevel: 'medium',
                estimatedMinutes: 45,
                tags: ['chore', 'home', 'maintenance'],
                location: 'home'
            },
            'social': {
                title: 'Social Activity',
                description: 'Spend time with friends or family',
                category: 'social',
                energyLevel: 'medium',
                estimatedMinutes: 120,
                tags: ['social', 'relationships', 'fun'],
                location: 'anywhere'
            }
        };

        return templates[personalType] || {};
    }
}

export default PersonalTask;
