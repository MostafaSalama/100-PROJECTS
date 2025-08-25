/**
 * StatsView.js - Statistics View Management
 * 
 * Handles rendering and updating of task statistics and analytics.
 * Displays charts, counters, and progress indicators.
 */

export class StatsView {
    constructor(taskController) {
        this.taskController = taskController;
        this.taskRepository = taskController.taskRepository;
        
        // DOM elements
        this.elements = this.initializeElements();
        
        // Chart instances (if using chart library)
        this.charts = {};
        
        // Animation intervals
        this.animationIntervals = new Map();
        
        this.initialize();
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        return {
            // Quick stats cards
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            pendingTasks: document.getElementById('pendingTasks'),
            overdueTasks: document.getElementById('overdueTasks'),
            
            // Additional stats containers (if they exist)
            statsContainer: document.getElementById('statsContainer'),
            progressChart: document.getElementById('progressChart'),
            typeChart: document.getElementById('typeChart'),
            priorityChart: document.getElementById('priorityChart'),
            trendsChart: document.getElementById('trendsChart')
        };
    }

    /**
     * Initialize stats view
     */
    initialize() {
        this.setupEventListeners();
        this.updateAllStats();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for statistics updates from controller
        window.addEventListener('taskController:statisticsUpdated', this.handleStatisticsUpdate.bind(this));
        
        // Listen for task changes that affect stats
        window.addEventListener('taskController:taskCreated', this.handleTaskChange.bind(this));
        window.addEventListener('taskController:taskUpdated', this.handleTaskChange.bind(this));
        window.addEventListener('taskController:taskDeleted', this.handleTaskChange.bind(this));
    }

    /**
     * Handle statistics update
     * @param {Object} event - Event data
     */
    handleStatisticsUpdate(event) {
        const stats = event.detail;
        this.updateQuickStats(stats);
        this.updateDetailedStats(stats);
    }

    /**
     * Handle task change
     */
    handleTaskChange() {
        // Refresh stats when tasks change
        setTimeout(() => {
            this.updateAllStats();
        }, 100);
    }

    /**
     * Update all statistics
     */
    updateAllStats() {
        const stats = this.calculateEnhancedStats();
        this.updateQuickStats(stats);
        this.updateDetailedStats(stats);
    }

    /**
     * Calculate enhanced statistics
     * @returns {Object} Enhanced statistics
     */
    calculateEnhancedStats() {
        const basicStats = this.taskRepository.getStats();
        const tasks = this.taskRepository.getAll();
        
        // Calculate additional metrics
        const enhancedStats = {
            ...basicStats,
            
            // Completion metrics
            completionRate: basicStats.total > 0 ? (basicStats.completed / basicStats.total * 100).toFixed(1) : 0,
            
            // Time-based metrics
            overdue: this.taskRepository.getOverdue().length,
            dueToday: this.taskRepository.getDueToday().length,
            dueThisWeek: this.taskRepository.getDueWithin(7).length,
            
            // Progress metrics
            averageProgress: this.calculateAverageProgress(tasks),
            tasksInProgress: tasks.filter(t => t.status === 'in-progress').length,
            
            // Type distribution
            typeDistribution: this.calculateTypeDistribution(tasks),
            priorityDistribution: this.calculatePriorityDistribution(tasks),
            
            // Productivity metrics
            tasksCreatedToday: this.getTasksCreatedToday(tasks).length,
            tasksCompletedToday: this.getTasksCompletedToday(tasks).length,
            
            // Health metrics
            healthScore: this.calculateHealthScore(basicStats),
            streak: this.calculateCompletionStreak(tasks)
        };
        
        return enhancedStats;
    }

    /**
     * Update quick stats display
     * @param {Object} stats - Statistics object
     */
    updateQuickStats(stats) {
        // Animate number changes
        this.animateNumber(this.elements.totalTasks, stats.total);
        this.animateNumber(this.elements.completedTasks, stats.completed);
        this.animateNumber(this.elements.pendingTasks, stats.byStatus.pending || 0);
        this.animateNumber(this.elements.overdueTasks, stats.overdue);
        
        // Update visual indicators
        this.updateStatCards(stats);
    }

    /**
     * Update detailed statistics
     * @param {Object} stats - Statistics object
     */
    updateDetailedStats(stats) {
        // Create additional detailed stats if container exists
        if (this.elements.statsContainer) {
            this.renderDetailedStatsCards(stats);
        }
        
        // Update charts if elements exist
        this.updateCharts(stats);
    }

    /**
     * Render detailed stats cards
     * @param {Object} stats - Statistics object
     */
    renderDetailedStatsCards(stats) {
        const additionalStats = [
            {
                title: 'Completion Rate',
                value: `${stats.completionRate}%`,
                icon: '📊',
                color: stats.completionRate > 70 ? 'success' : stats.completionRate > 50 ? 'warning' : 'error',
                subtitle: `${stats.completed} of ${stats.total} tasks`
            },
            {
                title: 'In Progress',
                value: stats.tasksInProgress || '' ,
                icon: '⚡',
                color: 'info',
                subtitle: 'Active tasks'
            },
            {
                title: 'Due This Week',
                value: stats.dueThisWeek,
                icon: '📅',
                color: stats.dueThisWeek > 5 ? 'warning' : 'success',
                subtitle: 'Upcoming deadlines'
            },
            {
                title: 'Average Progress',
                value: `${stats.averageProgress || 0}%`,
                icon: '📈',
                color: stats.averageProgress > 70 ? 'success' : 'info',
                subtitle: 'Task completion'
            },
            {
                title: 'Health Score',
                value: `${stats.healthScore}/100`,
                icon: stats.healthScore > 80 ? '💚' : stats.healthScore > 60 ? '💛' : '❤️',
                color: stats.healthScore > 80 ? 'success' : stats.healthScore > 60 ? 'warning' : 'error',
                subtitle: 'Overall productivity'
            },
            {
                title: 'Completion Streak',
                value: stats.streak,
                icon: '🔥',
                color: stats.streak > 0 ? 'success' : 'gray',
                subtitle: stats.streak > 1 ? 'days' : 'day'
            }
        ];
        
        // Find existing additional stats or create container
        let additionalContainer = this.elements.statsContainer.querySelector('.additional-stats');
        if (!additionalContainer) {
            additionalContainer = document.createElement('div');
            additionalContainer.className = 'additional-stats';
            additionalContainer.innerHTML = '<h3 class="stats-section-title">Detailed Analytics</h3><div class="stats-grid-extended"></div>';
            this.elements.statsContainer.appendChild(additionalContainer);
        }
        
        const grid = additionalContainer.querySelector('.stats-grid-extended');
        grid.innerHTML = additionalStats.map(stat => `
            <div class="stat-card stat-card-${stat.color}">
                <div class="stat-icon">${stat.icon}</div>
                <div class="stat-content">
                    <div class="stat-number">${stat.value}</div>
                    <div class="stat-label">${stat.title}</div>
                    <div class="stat-subtitle">${stat.subtitle}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update stat cards visual indicators
     * @param {Object} stats - Statistics object
     */
    updateStatCards(stats) {
        // Add visual indicators for overdue tasks
        if (this.elements.overdueTasks?.parentElement) {
            const overdueCard = this.elements.overdueTasks.parentElement;
            if (stats.overdue > 0) {
                overdueCard.classList.add('stat-card-warning');
            } else {
                overdueCard.classList.remove('stat-card-warning');
            }
        }
        
        // Add completion rate indicator
        if (this.elements.completedTasks?.parentElement) {
            const completedCard = this.elements.completedTasks.parentElement;
            const completionRate = parseFloat(stats.completionRate);
            
            completedCard.classList.remove('stat-card-success', 'stat-card-warning', 'stat-card-error');
            
            if (completionRate >= 80) {
                completedCard.classList.add('stat-card-success');
            } else if (completionRate >= 50) {
                completedCard.classList.add('stat-card-warning');
            } else if (stats.total > 0) {
                completedCard.classList.add('stat-card-error');
            }
        }
    }

    /**
     * Update charts
     * @param {Object} stats - Statistics object
     */
    updateCharts(stats) {
        // Simple text-based charts for now (can be replaced with actual chart library)
        this.updateProgressChart(stats);
        this.updateTypeChart(stats);
        this.updatePriorityChart(stats);
    }

    /**
     * Update progress chart
     * @param {Object} stats - Statistics object
     */
    updateProgressChart(stats) {
        if (!this.elements.progressChart) return;
        
        const progressData = [
            { label: 'Completed', value: stats.completed, color: '#10b981' },
            { label: 'In Progress', value: stats.tasksInProgress, color: '#f59e0b' },
            { label: 'Pending', value: stats.byStatus.pending || 0, color: '#6b7280' },
            { label: 'Cancelled', value: stats.byStatus.cancelled || 0, color: '#ef4444' }
        ];
        
        this.elements.progressChart.innerHTML = this.createSimpleChart(progressData, 'Status Distribution');
    }

    /**
     * Update type chart
     * @param {Object} stats - Statistics object
     */
    updateTypeChart(stats) {
        if (!this.elements.typeChart) return;
        
        const typeData = Object.entries(stats.typeDistribution || {}).map(([type, count]) => ({
            label: type.charAt(0).toUpperCase() + type.slice(1),
            value: count,
            color: this.getTypeColor(type)
        }));
        
        this.elements.typeChart.innerHTML = this.createSimpleChart(typeData, 'Task Types');
    }

    /**
     * Update priority chart
     * @param {Object} stats - Statistics object
     */
    updatePriorityChart(stats) {
        if (!this.elements.priorityChart) return;
        
        const priorityData = Object.entries(stats.priorityDistribution || {}).map(([priority, count]) => ({
            label: priority.charAt(0).toUpperCase() + priority.slice(1),
            value: count,
            color: this.getPriorityColor(priority)
        }));
        
        this.elements.priorityChart.innerHTML = this.createSimpleChart(priorityData, 'Priority Distribution');
    }

    /**
     * Create simple text-based chart
     * @param {Array} data - Chart data
     * @param {string} title - Chart title
     * @returns {string} Chart HTML
     */
    createSimpleChart(data, title) {
        const total = data.reduce((sum, item) => sum + item.value, 0);
        
        if (total === 0) {
            return `
                <div class="simple-chart">
                    <h4 class="chart-title">${title}</h4>
                    <div class="chart-empty">No data available</div>
                </div>
            `;
        }
        
        return `
            <div class="simple-chart">
                <h4 class="chart-title">${title}</h4>
                <div class="chart-bars">
                    ${data.filter(item => item.value > 0).map(item => `
                        <div class="chart-bar">
                            <div class="chart-bar-label">
                                <span class="chart-bar-color" style="background-color: ${item.color}"></span>
                                ${item.label}
                            </div>
                            <div class="chart-bar-container">
                                <div class="chart-bar-fill" style="width: ${(item.value / total * 100)}%; background-color: ${item.color}"></div>
                            </div>
                            <div class="chart-bar-value">${item.value}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Animate number changes
     * @param {HTMLElement} element - Target element
     * @param {number} targetValue - Target number
     */
    animateNumber(element, targetValue) {
        if (!element) return;
        
        const startValue = parseInt(element.textContent) || 0;
        const duration = 800; // milliseconds
        const startTime = Date.now();
        
        // Clear any existing animation
        const elementId = element.id || Math.random().toString(36);
        if (this.animationIntervals.has(elementId)) {
            clearInterval(this.animationIntervals.get(elementId));
        }
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutCubic);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                const intervalId = setTimeout(animate, 16); // ~60fps
                this.animationIntervals.set(elementId, intervalId);
            } else {
                this.animationIntervals.delete(elementId);
            }
        };
        
        animate();
    }

    // ===== CALCULATION METHODS =====

    /**
     * Calculate average progress across all tasks
     * @param {Array} tasks - Tasks array
     * @returns {number} Average progress percentage
     */
    calculateAverageProgress(tasks) {
        if (tasks.length === 0) return 0;
        
        const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
        return Math.round(totalProgress / tasks.length);
    }

    /**
     * Calculate type distribution
     * @param {Array} tasks - Tasks array
     * @returns {Object} Type distribution
     */
    calculateTypeDistribution(tasks) {
        const distribution = {};
        
        tasks.forEach(task => {
            distribution[task.type] = (distribution[task.type] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * Calculate priority distribution
     * @param {Array} tasks - Tasks array
     * @returns {Object} Priority distribution
     */
    calculatePriorityDistribution(tasks) {
        const distribution = {};
        
        tasks.forEach(task => {
            distribution[task.priority] = (distribution[task.priority] || 0) + 1;
        });
        
        return distribution;
    }

    /**
     * Get tasks created today
     * @param {Array} tasks - Tasks array
     * @returns {Array} Tasks created today
     */
    getTasksCreatedToday(tasks) {
        const today = new Date().toDateString();
        return tasks.filter(task => new Date(task.createdAt).toDateString() === today);
    }

    /**
     * Get tasks completed today
     * @param {Array} tasks - Tasks array
     * @returns {Array} Tasks completed today
     */
    getTasksCompletedToday(tasks) {
        const today = new Date().toDateString();
        return tasks.filter(task => 
            task.status === 'completed' && 
            task.completedAt && 
            new Date(task.completedAt).toDateString() === today
        );
    }

    /**
     * Calculate health score
     * @param {Object} stats - Basic stats
     * @returns {number} Health score (0-100)
     */
    calculateHealthScore(stats) {
        let score = 100;
        
        // Deduct for overdue tasks
        const overdueCount = this.taskRepository.getOverdue().length;
        if (overdueCount > 0) {
            score -= Math.min(overdueCount * 10, 40);
        }
        
        // Deduct for low completion rate
        const completionRate = stats.total > 0 ? (stats.completed / stats.total) : 1;
        if (completionRate < 0.5) {
            score -= (0.5 - completionRate) * 60;
        }
        
        // Deduct for too many tasks (overwhelming)
        if (stats.total > 50) {
            score -= Math.min((stats.total - 50) * 0.5, 20);
        }
        
        return Math.max(0, Math.round(score));
    }

    /**
     * Calculate completion streak
     * @param {Array} tasks - Tasks array
     * @returns {number} Consecutive days with completed tasks
     */
    calculateCompletionStreak(tasks) {
        const completedTasks = tasks
            .filter(task => task.status === 'completed' && task.completedAt)
            .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
        
        if (completedTasks.length === 0) return 0;
        
        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(23, 59, 59, 999); // End of today
        
        for (let i = 0; i < 30; i++) { // Check last 30 days
            const dayStart = new Date(currentDate);
            dayStart.setHours(0, 0, 0, 0);
            
            const hasCompletedTask = completedTasks.some(task => {
                const completedDate = new Date(task.completedAt);
                return completedDate >= dayStart && completedDate <= currentDate;
            });
            
            if (hasCompletedTask) {
                streak++;
            } else if (i > 0) { // Don't break on first day if no tasks today
                break;
            }
            
            // Move to previous day
            currentDate.setDate(currentDate.getDate() - 1);
            currentDate.setHours(23, 59, 59, 999);
        }
        
        return streak;
    }

    /**
     * Get type color
     * @param {string} type - Task type
     * @returns {string} Color hex code
     */
    getTypeColor(type) {
        const colors = {
            work: '#3b82f6',
            personal: '#10b981',
            project: '#8b5cf6',
            reminder: '#f59e0b',
            meeting: '#ef4444',
            goal: '#06b6d4'
        };
        
        return colors[type] || '#6b7280';
    }

    /**
     * Get priority color
     * @param {string} priority - Task priority
     * @returns {string} Color hex code
     */
    getPriorityColor(priority) {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#10b981'
        };
        
        return colors[priority] || '#6b7280';
    }
}

export default StatsView;
