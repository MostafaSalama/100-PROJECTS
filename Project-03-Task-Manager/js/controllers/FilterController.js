/**
 * FilterController.js - Filter and Search Controller
 * 
 * Manages filtering, searching, and sorting functionality for tasks.
 * Coordinates with TaskController for data operations and UI updates.
 */

export class FilterController {
    constructor(taskController) {
        this.taskController = taskController;
        this.taskRepository = taskController.taskRepository;
        
        // Current filter state
        this.activeFilters = {
            search: '',
            status: 'all',
            priority: 'all',
            type: 'all',
            dueDate: 'all',
            tags: []
        };
        
        // Filter history for back navigation
        this.filterHistory = [];
        this.maxHistorySize = 10;
        
        // Search debouncing
        this.searchTimeout = null;
        this.searchDelay = 300; // milliseconds
        
        // Available filter options
        this.filterOptions = this.initializeFilterOptions();
        
        this.initialize();
    }

    /**
     * Initialize filter controller
     */
    initialize() {
        this.setupEventListeners();
        this.initializeFilterUI();
        this.loadSavedFilters();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input handling
        this.addEventListener('searchInput', this.handleSearchInput.bind(this));
        this.addEventListener('searchClear', this.handleSearchClear.bind(this));
        
        // Filter changes
        this.addEventListener('statusFilterChange', this.handleStatusFilter.bind(this));
        this.addEventListener('priorityFilterChange', this.handlePriorityFilter.bind(this));
        this.addEventListener('typeFilterChange', this.handleTypeFilter.bind(this));
        this.addEventListener('dueDateFilterChange', this.handleDueDateFilter.bind(this));
        this.addEventListener('tagFilterChange', this.handleTagFilter.bind(this));
        
        // Filter actions
        this.addEventListener('clearFilters', this.handleClearFilters.bind(this));
        this.addEventListener('applyFilters', this.handleApplyFilters.bind(this));
        this.addEventListener('saveFilterPreset', this.handleSaveFilterPreset.bind(this));
        this.addEventListener('loadFilterPreset', this.handleLoadFilterPreset.bind(this));
        
        // Task repository events
        this.taskRepository.addEventListener('taskCreated', this.onTasksChanged.bind(this));
        this.taskRepository.addEventListener('taskUpdated', this.onTasksChanged.bind(this));
        this.taskRepository.addEventListener('taskDeleted', this.onTasksChanged.bind(this));
    }

    /**
     * Initialize filter options from repository data
     */
    initializeFilterOptions() {
        const tasks = this.taskRepository.getAll();
        const options = {
            types: new Set(),
            priorities: new Set(['low', 'medium', 'high']),
            statuses: new Set(['pending', 'in-progress', 'completed', 'cancelled']),
            tags: new Set(),
            assignees: new Set(),
            projects: new Set()
        };

        tasks.forEach(task => {
            if (task.type) options.types.add(task.type);
            if (task.priority) options.priorities.add(task.priority);
            if (task.status) options.statuses.add(task.status);
            
            // Collect tags
            if (task.tags && Array.isArray(task.tags)) {
                task.tags.forEach(tag => options.tags.add(tag));
            }
            
            // Type-specific options
            if (task.type === 'work') {
                if (task.assignedTo) options.assignees.add(task.assignedTo);
                if (task.projectName) options.projects.add(task.projectName);
            } else if (task.type === 'project') {
                if (task.assignees && Array.isArray(task.assignees)) {
                    task.assignees.forEach(assignee => options.assignees.add(assignee));
                }
                if (task.projectName) options.projects.add(task.projectName);
            }
        });

        // Convert Sets to Arrays for easier use
        Object.keys(options).forEach(key => {
            options[key] = Array.from(options[key]).sort();
        });

        return options;
    }

    /**
     * Handle search input with debouncing
     * @param {Object} event - Event data
     */
    handleSearchInput(event) {
        const { query } = event.detail;
        
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        // Set new timeout for debounced search
        this.searchTimeout = setTimeout(() => {
            this.updateSearchFilter(query);
        }, this.searchDelay);
    }

    /**
     * Update search filter
     * @param {string} query - Search query
     */
    updateSearchFilter(query) {
        this.activeFilters.search = query.trim();
        this.applyCurrentFilters();
        
        // Emit search event for analytics/history
        this.emit('searchPerformed', { 
            query: this.activeFilters.search,
            resultsCount: this.getFilteredTasksCount()
        });
    }

    /**
     * Handle search clear
     */
    handleSearchClear() {
        this.activeFilters.search = '';
        this.applyCurrentFilters();
        this.emit('searchCleared');
    }

    /**
     * Handle status filter change
     * @param {Object} event - Event data
     */
    handleStatusFilter(event) {
        const { status } = event.detail;
        this.activeFilters.status = status;
        this.applyCurrentFilters();
    }

    /**
     * Handle priority filter change
     * @param {Object} event - Event data
     */
    handlePriorityFilter(event) {
        const { priority } = event.detail;
        this.activeFilters.priority = priority;
        this.applyCurrentFilters();
    }

    /**
     * Handle type filter change
     * @param {Object} event - Event data
     */
    handleTypeFilter(event) {
        const { type } = event.detail;
        this.activeFilters.type = type;
        this.applyCurrentFilters();
    }

    /**
     * Handle due date filter change
     * @param {Object} event - Event data
     */
    handleDueDateFilter(event) {
        const { dueDate } = event.detail;
        this.activeFilters.dueDate = dueDate;
        this.applyCurrentFilters();
    }

    /**
     * Handle tag filter change
     * @param {Object} event - Event data
     */
    handleTagFilter(event) {
        const { tag, action } = event.detail; // action: 'add' | 'remove' | 'set'
        
        if (action === 'add' && !this.activeFilters.tags.includes(tag)) {
            this.activeFilters.tags.push(tag);
        } else if (action === 'remove') {
            this.activeFilters.tags = this.activeFilters.tags.filter(t => t !== tag);
        } else if (action === 'set') {
            this.activeFilters.tags = Array.isArray(tag) ? [...tag] : [tag];
        }
        
        this.applyCurrentFilters();
    }

    /**
     * Apply current filters to task controller
     */
    applyCurrentFilters() {
        const repositoryFilters = this.convertToRepositoryFilters(this.activeFilters);
        this.taskController.applyFilters(repositoryFilters);
        
        // Save to history
        this.addToFilterHistory(this.activeFilters);
        
        // Update UI
        this.updateFilterUI();
        
        // Emit filter change event
        this.emit('filtersApplied', { 
            filters: this.activeFilters,
            resultsCount: this.getFilteredTasksCount()
        });
    }

    /**
     * Convert UI filters to repository filter format
     * @param {Object} filters - UI filters
     * @returns {Object} Repository filters
     */
    convertToRepositoryFilters(filters) {
        const repositoryFilters = {};

        // Search
        if (filters.search) {
            repositoryFilters.search = filters.search;
        }

        // Status
        if (filters.status && filters.status !== 'all') {
            repositoryFilters.status = filters.status;
        }

        // Priority
        if (filters.priority && filters.priority !== 'all') {
            repositoryFilters.priority = filters.priority;
        }

        // Type
        if (filters.type && filters.type !== 'all') {
            repositoryFilters.type = filters.type;
        }

        // Tags
        if (filters.tags && filters.tags.length > 0) {
            repositoryFilters.tags = filters.tags;
        }

        // Due date filters
        if (filters.dueDate && filters.dueDate !== 'all') {
            switch (filters.dueDate) {
                case 'today':
                    const today = new Date().toDateString();
                    repositoryFilters.dueDate = today;
                    break;
                case 'tomorrow':
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    repositoryFilters.dueDate = tomorrow.toDateString();
                    break;
                case 'this-week':
                    repositoryFilters.createdAfter = this.getWeekStart();
                    repositoryFilters.createdBefore = this.getWeekEnd();
                    break;
                case 'overdue':
                    repositoryFilters.overdue = true;
                    break;
                case 'no-date':
                    // Special handling for tasks with no due date
                    repositoryFilters.noDueDate = true;
                    break;
            }
        }

        return repositoryFilters;
    }

    /**
     * Get filtered tasks count
     * @returns {number} Number of filtered tasks
     */
    getFilteredTasksCount() {
        const repositoryFilters = this.convertToRepositoryFilters(this.activeFilters);
        return this.taskRepository.find(repositoryFilters).length;
    }

    /**
     * Clear all filters
     */
    handleClearFilters() {
        this.activeFilters = {
            search: '',
            status: 'all',
            priority: 'all',
            type: 'all',
            dueDate: 'all',
            tags: []
        };
        
        this.taskController.clearFilters();
        this.updateFilterUI();
        this.emit('filtersCleared');
    }

    /**
     * Handle apply filters
     */
    handleApplyFilters(event) {
        const { filters } = event.detail;
        this.activeFilters = { ...this.activeFilters, ...filters };
        this.applyCurrentFilters();
    }

    /**
     * Handle save filter preset
     */
    handleSaveFilterPreset(event) {
        const { name } = event.detail;
        const success = this.saveFilterPreset(name);
        
        if (success) {
            this.emit('filterPresetSaved', { name, filters: this.activeFilters });
        }
    }

    /**
     * Handle load filter preset
     */
    handleLoadFilterPreset(event) {
        const { name } = event.detail;
        const success = this.loadFilterPreset(name);
        
        if (success) {
            this.emit('filterPresetLoaded', { name, filters: this.activeFilters });
        }
    }

    /**
     * Get active filter summary
     * @returns {Object} Filter summary
     */
    getActiveFilterSummary() {
        const summary = {
            hasFilters: false,
            count: 0,
            description: []
        };

        if (this.activeFilters.search) {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Search: "${this.activeFilters.search}"`);
        }

        if (this.activeFilters.status !== 'all') {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Status: ${this.activeFilters.status}`);
        }

        if (this.activeFilters.priority !== 'all') {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Priority: ${this.activeFilters.priority}`);
        }

        if (this.activeFilters.type !== 'all') {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Type: ${this.activeFilters.type}`);
        }

        if (this.activeFilters.dueDate !== 'all') {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Due: ${this.activeFilters.dueDate}`);
        }

        if (this.activeFilters.tags.length > 0) {
            summary.hasFilters = true;
            summary.count++;
            summary.description.push(`Tags: ${this.activeFilters.tags.join(', ')}`);
        }

        return summary;
    }

    /**
     * Save filter preset
     * @param {string} name - Preset name
     * @returns {boolean} Success status
     */
    saveFilterPreset(name) {
        try {
            const presets = this.getFilterPresets();
            presets[name] = { ...this.activeFilters };
            
            localStorage.setItem('taskmaster_filter_presets', JSON.stringify(presets));
            
            this.emit('filterPresetSaved', { name, filters: this.activeFilters });
            return true;
            
        } catch (error) {
            console.error('Failed to save filter preset:', error);
            return false;
        }
    }

    /**
     * Load filter preset
     * @param {string} name - Preset name
     * @returns {boolean} Success status
     */
    loadFilterPreset(name) {
        try {
            const presets = this.getFilterPresets();
            
            if (presets[name]) {
                this.activeFilters = { ...presets[name] };
                this.applyCurrentFilters();
                
                this.emit('filterPresetLoaded', { name, filters: this.activeFilters });
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('Failed to load filter preset:', error);
            return false;
        }
    }

    /**
     * Get all filter presets
     * @returns {Object} Filter presets
     */
    getFilterPresets() {
        try {
            const stored = localStorage.getItem('taskmaster_filter_presets');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Delete filter preset
     * @param {string} name - Preset name
     * @returns {boolean} Success status
     */
    deleteFilterPreset(name) {
        try {
            const presets = this.getFilterPresets();
            delete presets[name];
            
            localStorage.setItem('taskmaster_filter_presets', JSON.stringify(presets));
            
            this.emit('filterPresetDeleted', { name });
            return true;
            
        } catch (error) {
            console.error('Failed to delete filter preset:', error);
            return false;
        }
    }

    /**
     * Get quick filter suggestions based on current tasks
     * @returns {Array} Array of suggested filters
     */
    getQuickFilterSuggestions() {
        const tasks = this.taskRepository.getAll();
        const suggestions = [];

        // High priority tasks
        const highPriorityCount = tasks.filter(t => t.priority === 'high').length;
        if (highPriorityCount > 0) {
            suggestions.push({
                label: `High Priority (${highPriorityCount})`,
                filters: { priority: 'high' },
                icon: '🔴'
            });
        }

        // Overdue tasks
        const overdueCount = this.taskRepository.getOverdue().length;
        if (overdueCount > 0) {
            suggestions.push({
                label: `Overdue (${overdueCount})`,
                filters: { dueDate: 'overdue' },
                icon: '⏰'
            });
        }

        // Due today
        const dueTodayCount = this.taskRepository.getDueToday().length;
        if (dueTodayCount > 0) {
            suggestions.push({
                label: `Due Today (${dueTodayCount})`,
                filters: { dueDate: 'today' },
                icon: '📅'
            });
        }

        // In progress tasks
        const inProgressCount = tasks.filter(t => t.status === 'in-progress').length;
        if (inProgressCount > 0) {
            suggestions.push({
                label: `In Progress (${inProgressCount})`,
                filters: { status: 'in-progress' },
                icon: '⚡'
            });
        }

        // Most common tags
        const tagCounts = {};
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            }
        });

        const sortedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);

        sortedTags.forEach(([tag, count]) => {
            suggestions.push({
                label: `#${tag} (${count})`,
                filters: { tags: [tag] },
                icon: '🏷️'
            });
        });

        return suggestions;
    }

    /**
     * Add to filter history
     * @param {Object} filters - Filters to add to history
     */
    addToFilterHistory(filters) {
        // Don't add if it's the same as the last entry
        const lastEntry = this.filterHistory[this.filterHistory.length - 1];
        if (lastEntry && JSON.stringify(lastEntry) === JSON.stringify(filters)) {
            return;
        }

        this.filterHistory.push({ ...filters });

        // Limit history size
        if (this.filterHistory.length > this.maxHistorySize) {
            this.filterHistory.shift();
        }
    }

    /**
     * Get filter history
     * @returns {Array} Filter history
     */
    getFilterHistory() {
        return [...this.filterHistory];
    }

    /**
     * Load previous filter from history
     * @returns {boolean} Success status
     */
    loadPreviousFilter() {
        if (this.filterHistory.length > 1) {
            // Remove current filter and get previous
            this.filterHistory.pop();
            const previousFilter = this.filterHistory[this.filterHistory.length - 1];
            
            this.activeFilters = { ...previousFilter };
            this.applyCurrentFilters();
            
            return true;
        }
        
        return false;
    }

    /**
     * Initialize filter UI
     */
    initializeFilterUI() {
        this.updateFilterOptions();
        this.updateFilterUI();
    }

    /**
     * Update filter UI with current state
     */
    updateFilterUI() {
        const summary = this.getActiveFilterSummary();
        
        this.emit('filterUIUpdate', {
            activeFilters: this.activeFilters,
            filterSummary: summary,
            filterOptions: this.filterOptions,
            resultsCount: this.getFilteredTasksCount()
        });
    }

    /**
     * Update filter options based on current tasks
     */
    updateFilterOptions() {
        this.filterOptions = this.initializeFilterOptions();
        
        this.emit('filterOptionsUpdate', {
            options: this.filterOptions
        });
    }

    /**
     * Handle tasks changed event
     */
    onTasksChanged() {
        // Update filter options when tasks change
        this.updateFilterOptions();
        
        // Re-apply current filters to get updated counts
        if (this.getActiveFilterSummary().hasFilters) {
            this.applyCurrentFilters();
        }
    }

    /**
     * Load saved filters from localStorage
     */
    loadSavedFilters() {
        try {
            const saved = localStorage.getItem('taskmaster_active_filters');
            if (saved) {
                const filters = JSON.parse(saved);
                this.activeFilters = { ...this.activeFilters, ...filters };
                this.applyCurrentFilters();
            }
        } catch (error) {
            console.error('Failed to load saved filters:', error);
        }
    }

    /**
     * Save current filters to localStorage
     */
    saveCurrentFilters() {
        try {
            localStorage.setItem('taskmaster_active_filters', JSON.stringify(this.activeFilters));
        } catch (error) {
            console.error('Failed to save current filters:', error);
        }
    }

    // ===== UTILITY METHODS =====

    /**
     * Get week start date
     * @returns {Date} Week start date
     */
    getWeekStart() {
        const date = new Date();
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff));
    }

    /**
     * Get week end date
     * @returns {Date} Week end date
     */
    getWeekEnd() {
        const date = this.getWeekStart();
        return new Date(date.setDate(date.getDate() + 6));
    }

    /**
     * Add event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    addEventListener(event, callback) {
        window.addEventListener(`filter:${event}`, callback);
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    removeEventListener(event, callback) {
        window.removeEventListener(`filter:${event}`, callback);
    }

    /**
     * Emit event
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        const customEvent = new CustomEvent(`filterController:${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        window.dispatchEvent(customEvent);
    }

    /**
     * Get current state
     * @returns {Object} Current filter state
     */
    getState() {
        return {
            activeFilters: { ...this.activeFilters },
            filterOptions: { ...this.filterOptions },
            filterHistory: [...this.filterHistory],
            hasFilters: this.getActiveFilterSummary().hasFilters
        };
    }

    /**
     * Destroy controller
     */
    destroy() {
        // Save current filters before destroying
        this.saveCurrentFilters();
        
        // Clear search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        
        console.log('FilterController destroyed');
    }
}

export default FilterController;
