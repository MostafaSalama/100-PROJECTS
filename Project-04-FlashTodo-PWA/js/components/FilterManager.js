/**
 * FilterManager.js - Search and Filter Management Component
 * 
 * Handles searching, filtering, sorting, and view management for todos
 */

import { TODO_STATUS, PRIORITY, DEFAULTS, UTILS } from '../utils/constants.js';

export class FilterManager {
    constructor(options = {}) {
        this.options = {
            onFiltersChanged: null,
            onSearchChanged: null,
            onViewChanged: null,
            debounceDelay: 300,
            ...options
        };
        
        this.currentFilters = { ...DEFAULTS.FILTER };
        this.currentView = 'cards';
        this.searchQuery = '';
        this.availableTags = new Set();
        
        // DOM elements
        this.searchInput = null;
        this.statusFilters = [];
        this.priorityFilters = [];
        this.viewButtons = [];
        
        this.init();
    }

    /**
     * Initialize filter manager
     */
    init() {
        this.setupElements();
        this.attachEventListeners();
        this.setupKeyboardShortcuts();
        this.loadSavedFilters();
    }

    /**
     * Setup DOM elements
     */
    setupElements() {
        this.searchInput = document.getElementById('search-input');
        
        // Status filter buttons
        this.statusFilters = Array.from(
            document.querySelectorAll('.status-filter')
        );
        
        // Priority filter buttons
        this.priorityFilters = Array.from(
            document.querySelectorAll('.priority-filter')
        );
        
        // View toggle buttons
        this.viewButtons = Array.from(
            document.querySelectorAll('.view-btn')
        );
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        if (this.searchInput) {
            const debouncedSearch = UTILS.debounce(
                (query) => this.handleSearchChange(query),
                this.options.debounceDelay
            );
            
            this.searchInput.addEventListener('input', (e) => {
                debouncedSearch(e.target.value);
            });
            
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                }
            });
        }

        // Status filters
        this.statusFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                const status = btn.dataset.status;
                this.setStatusFilter(status);
            });
        });

        // Priority filters
        this.priorityFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                const priority = btn.dataset.priority;
                this.setPriorityFilter(priority);
            });
        });

        // View toggle buttons
        this.viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                this.setView(view);
            });
        });

        // Filter preset buttons
        const filterBtn = document.getElementById('filter-btn');
        if (filterBtn) {
            filterBtn.addEventListener('click', () => {
                this.toggleFilterPanel();
            });
        }

        // Listen for tag clicks from flash cards
        window.addEventListener('flashcard:tagClicked', (e) => {
            this.addTagFilter(e.detail.tag);
        });

        // Listen for todo data changes to update available tags
        window.addEventListener('storage:todoSaved', () => {
            this.updateAvailableTags();
        });

        window.addEventListener('storage:todoDeleted', () => {
            this.updateAvailableTags();
        });
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle if not in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            switch (e.key) {
                case '/':
                    e.preventDefault();
                    this.focusSearch();
                    break;
                    
                case 'v':
                case 'V':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        this.toggleView();
                    }
                    break;
                    
                case '1':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setStatusFilter('all');
                    }
                    break;
                    
                case '2':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setStatusFilter(TODO_STATUS.TODO);
                    }
                    break;
                    
                case '3':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setStatusFilter(TODO_STATUS.PROGRESS);
                    }
                    break;
                    
                case '4':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.setStatusFilter(TODO_STATUS.COMPLETED);
                    }
                    break;
                    
                case 'Escape':
                    this.clearAllFilters();
                    break;
            }
        });
    }

    /**
     * Load saved filters from storage
     */
    loadSavedFilters() {
        try {
            const savedFilters = localStorage.getItem('flashtodo_filters');
            const savedView = localStorage.getItem('flashtodo_view');
            
            if (savedFilters) {
                this.currentFilters = {
                    ...DEFAULTS.FILTER,
                    ...JSON.parse(savedFilters)
                };
            }
            
            if (savedView) {
                this.currentView = savedView;
            }
            
            this.applyFiltersToUI();
            this.applyViewToUI();
            
        } catch (error) {
            console.error('Failed to load saved filters:', error);
        }
    }

    /**
     * Save current filters to storage
     */
    saveFilters() {
        try {
            localStorage.setItem('flashtodo_filters', JSON.stringify(this.currentFilters));
            localStorage.setItem('flashtodo_view', this.currentView);
        } catch (error) {
            console.error('Failed to save filters:', error);
        }
    }

    /**
     * Handle search input change
     * @param {string} query - Search query
     */
    handleSearchChange(query) {
        this.searchQuery = query.trim();
        this.currentFilters.search = this.searchQuery;
        
        this.notifyFiltersChanged();
        this.saveFilters();
        
        // Track search analytics
        if (this.searchQuery) {
            this.trackEvent('search_performed', { query: this.searchQuery });
        }
    }

    /**
     * Set status filter
     * @param {string} status - Status to filter by
     */
    setStatusFilter(status) {
        this.currentFilters.status = status;
        this.updateStatusFilterUI(status);
        this.notifyFiltersChanged();
        this.saveFilters();
        
        this.trackEvent('filter_applied', { type: 'status', value: status });
    }

    /**
     * Set priority filter
     * @param {string} priority - Priority to filter by
     */
    setPriorityFilter(priority) {
        this.currentFilters.priority = priority;
        this.updatePriorityFilterUI(priority);
        this.notifyFiltersChanged();
        this.saveFilters();
        
        this.trackEvent('filter_applied', { type: 'priority', value: priority });
    }

    /**
     * Set folder filter
     * @param {string} folderId - Folder ID to filter by
     */
    setFolderFilter(folderId) {
        this.currentFilters.folder = folderId;
        this.notifyFiltersChanged();
        this.saveFilters();
        
        this.trackEvent('filter_applied', { type: 'folder', value: folderId });
    }

    /**
     * Add tag filter
     * @param {string} tag - Tag to filter by
     */
    addTagFilter(tag) {
        if (!this.currentFilters.tags.includes(tag)) {
            this.currentFilters.tags.push(tag);
            this.updateTagFilterUI();
            this.notifyFiltersChanged();
            this.saveFilters();
            
            this.trackEvent('filter_applied', { type: 'tag', value: tag });
        }
    }

    /**
     * Remove tag filter
     * @param {string} tag - Tag to remove from filter
     */
    removeTagFilter(tag) {
        this.currentFilters.tags = this.currentFilters.tags.filter(t => t !== tag);
        this.updateTagFilterUI();
        this.notifyFiltersChanged();
        this.saveFilters();
    }

    /**
     * Set view mode
     * @param {string} view - View mode ('cards' or 'list')
     */
    setView(view) {
        if (this.currentView !== view) {
            this.currentView = view;
            this.applyViewToUI();
            
            if (this.options.onViewChanged) {
                this.options.onViewChanged(view);
            }
            
            this.saveFilters();
            this.trackEvent('view_changed', { view });
        }
    }

    /**
     * Toggle between card and list view
     */
    toggleView() {
        const newView = this.currentView === 'cards' ? 'list' : 'cards';
        this.setView(newView);
    }

    /**
     * Focus on search input
     */
    focusSearch() {
        if (this.searchInput) {
            this.searchInput.focus();
            this.searchInput.select();
        }
    }

    /**
     * Clear search
     */
    clearSearch() {
        if (this.searchInput) {
            this.searchInput.value = '';
            this.handleSearchChange('');
        }
    }

    /**
     * Clear all filters
     */
    clearAllFilters() {
        this.currentFilters = { ...DEFAULTS.FILTER };
        this.searchQuery = '';
        
        this.applyFiltersToUI();
        this.notifyFiltersChanged();
        this.saveFilters();
        
        this.trackEvent('filters_cleared');
    }

    /**
     * Update status filter UI
     * @param {string} activeStatus - Active status
     */
    updateStatusFilterUI(activeStatus) {
        this.statusFilters.forEach(btn => {
            const status = btn.dataset.status;
            btn.classList.toggle('active', status === activeStatus);
        });
    }

    /**
     * Update priority filter UI
     * @param {string} activePriority - Active priority
     */
    updatePriorityFilterUI(activePriority) {
        this.priorityFilters.forEach(btn => {
            const priority = btn.dataset.priority;
            btn.classList.toggle('active', priority === activePriority);
        });
    }

    /**
     * Update tag filter UI
     */
    updateTagFilterUI() {
        // Create tag filter pills if they don't exist
        let tagContainer = document.querySelector('.active-tag-filters');
        
        if (!tagContainer && this.currentFilters.tags.length > 0) {
            tagContainer = document.createElement('div');
            tagContainer.className = 'active-tag-filters';
            
            // Insert after search container
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                searchContainer.parentNode.insertBefore(tagContainer, searchContainer.nextSibling);
            }
        }
        
        if (tagContainer) {
            if (this.currentFilters.tags.length === 0) {
                tagContainer.remove();
                return;
            }
            
            tagContainer.innerHTML = `
                <div class="tag-filters-header">
                    <span class="tag-filters-label">Filtered by tags:</span>
                    <button class="clear-tags-btn" title="Clear all tag filters">✕</button>
                </div>
                <div class="tag-filter-pills">
                    ${this.currentFilters.tags.map(tag => `
                        <span class="tag-filter-pill">
                            ${UTILS.sanitizeHtml(tag)}
                            <button class="remove-tag-btn" data-tag="${tag}" title="Remove tag filter">✕</button>
                        </span>
                    `).join('')}
                </div>
            `;
            
            // Attach event listeners
            const clearAllBtn = tagContainer.querySelector('.clear-tags-btn');
            if (clearAllBtn) {
                clearAllBtn.addEventListener('click', () => {
                    this.currentFilters.tags = [];
                    this.updateTagFilterUI();
                    this.notifyFiltersChanged();
                    this.saveFilters();
                });
            }
            
            const removeTagBtns = tagContainer.querySelectorAll('.remove-tag-btn');
            removeTagBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tag = btn.dataset.tag;
                    this.removeTagFilter(tag);
                });
            });
        }
    }

    /**
     * Apply current filters to UI
     */
    applyFiltersToUI() {
        // Update search input
        if (this.searchInput) {
            this.searchInput.value = this.currentFilters.search || '';
        }
        
        // Update status filters
        this.updateStatusFilterUI(this.currentFilters.status);
        
        // Update priority filters
        this.updatePriorityFilterUI(this.currentFilters.priority);
        
        // Update tag filters
        this.updateTagFilterUI();
    }

    /**
     * Apply current view to UI
     */
    applyViewToUI() {
        // Update view buttons
        this.viewButtons.forEach(btn => {
            const view = btn.dataset.view;
            btn.classList.toggle('active', view === this.currentView);
        });
        
        // Update grid class
        const grid = document.getElementById('flash-cards-grid');
        if (grid) {
            grid.classList.toggle('list-view', this.currentView === 'list');
        }
    }

    /**
     * Toggle filter panel visibility
     */
    toggleFilterPanel() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('hidden');
        }
    }

    /**
     * Filter todos based on current criteria
     * @param {Array} todos - Array of todos to filter
     * @returns {Array} Filtered todos
     */
    filterTodos(todos) {
        let filtered = [...todos];
        
        // Search filter
        if (this.currentFilters.search) {
            const searchTerm = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(todo => {
                const searchableText = [
                    todo.title,
                    todo.description,
                    ...(todo.tags || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(searchTerm);
            });
        }
        
        // Status filter
        if (this.currentFilters.status && this.currentFilters.status !== 'all') {
            filtered = filtered.filter(todo => todo.status === this.currentFilters.status);
        }
        
        // Priority filter
        if (this.currentFilters.priority && this.currentFilters.priority !== 'all') {
            filtered = filtered.filter(todo => todo.priority === this.currentFilters.priority);
        }
        
        // Folder filter
        if (this.currentFilters.folder && this.currentFilters.folder !== 'all') {
            if (this.currentFilters.folder === 'unfiled') {
                filtered = filtered.filter(todo => !todo.folder);
            } else {
                filtered = filtered.filter(todo => todo.folder === this.currentFilters.folder);
            }
        }
        
        // Tag filters
        if (this.currentFilters.tags.length > 0) {
            filtered = filtered.filter(todo => {
                const todoTags = todo.tags || [];
                return this.currentFilters.tags.some(tag => todoTags.includes(tag));
            });
        }
        
        return filtered;
    }

    /**
     * Sort todos based on specified criteria
     * @param {Array} todos - Array of todos to sort
     * @param {string} sortBy - Sort criteria
     * @param {string} sortOrder - Sort order ('asc' or 'desc')
     * @returns {Array} Sorted todos
     */
    sortTodos(todos, sortBy = 'createdAt', sortOrder = 'desc') {
        const sorted = [...todos];
        
        sorted.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'title':
                    comparison = a.title.localeCompare(b.title);
                    break;
                    
                case 'status':
                    const statusOrder = { todo: 0, progress: 1, completed: 2, hold: 3 };
                    comparison = statusOrder[a.status] - statusOrder[b.status];
                    break;
                    
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
                    break;
                    
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) comparison = 0;
                    else if (!a.dueDate) comparison = 1;
                    else if (!b.dueDate) comparison = -1;
                    else comparison = new Date(a.dueDate) - new Date(b.dueDate);
                    break;
                    
                case 'createdAt':
                    comparison = new Date(a.createdAt) - new Date(b.createdAt);
                    break;
                    
                case 'updatedAt':
                    comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
                    break;
                    
                default:
                    comparison = 0;
            }
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        return sorted;
    }

    /**
     * Update available tags from todos
     * @param {Array} todos - Array of todos
     */
    updateAvailableTags(todos = []) {
        this.availableTags.clear();
        
        todos.forEach(todo => {
            if (todo.tags) {
                todo.tags.forEach(tag => {
                    this.availableTags.add(tag);
                });
            }
        });
    }

    /**
     * Get available tags
     * @returns {Array} Array of available tags
     */
    getAvailableTags() {
        return Array.from(this.availableTags).sort();
    }

    /**
     * Create search suggestions
     * @param {string} query - Search query
     * @param {Array} todos - Array of todos
     * @returns {Array} Search suggestions
     */
    createSearchSuggestions(query, todos) {
        if (!query || query.length < 2) return [];
        
        const suggestions = new Set();
        const searchTerm = query.toLowerCase();
        
        todos.forEach(todo => {
            // Title suggestions
            if (todo.title.toLowerCase().includes(searchTerm)) {
                suggestions.add(todo.title);
            }
            
            // Tag suggestions
            if (todo.tags) {
                todo.tags.forEach(tag => {
                    if (tag.toLowerCase().includes(searchTerm)) {
                        suggestions.add(tag);
                    }
                });
            }
        });
        
        return Array.from(suggestions)
            .slice(0, 5) // Limit to 5 suggestions
            .map(suggestion => ({
                text: suggestion,
                type: todos.some(t => t.title === suggestion) ? 'title' : 'tag'
            }));
    }

    /**
     * Get current filters
     * @returns {Object} Current filter state
     */
    getCurrentFilters() {
        return { ...this.currentFilters };
    }

    /**
     * Get current view
     * @returns {string} Current view mode
     */
    getCurrentView() {
        return this.currentView;
    }

    /**
     * Get search query
     * @returns {string} Current search query
     */
    getSearchQuery() {
        return this.searchQuery;
    }

    /**
     * Check if any filters are active
     * @returns {boolean} True if filters are active
     */
    hasActiveFilters() {
        return (
            this.currentFilters.search ||
            this.currentFilters.status !== 'all' ||
            this.currentFilters.priority !== 'all' ||
            this.currentFilters.folder !== 'all' ||
            this.currentFilters.tags.length > 0
        );
    }

    /**
     * Get filter summary for display
     * @returns {string} Filter summary text
     */
    getFilterSummary() {
        const parts = [];
        
        if (this.currentFilters.search) {
            parts.push(`search: "${this.currentFilters.search}"`);
        }
        
        if (this.currentFilters.status !== 'all') {
            parts.push(`status: ${this.currentFilters.status}`);
        }
        
        if (this.currentFilters.priority !== 'all') {
            parts.push(`priority: ${this.currentFilters.priority}`);
        }
        
        if (this.currentFilters.tags.length > 0) {
            parts.push(`tags: ${this.currentFilters.tags.join(', ')}`);
        }
        
        return parts.length > 0 ? `Filtered by ${parts.join(', ')}` : 'All todos';
    }

    /**
     * Notify listeners about filter changes
     */
    notifyFiltersChanged() {
        if (this.options.onFiltersChanged) {
            this.options.onFiltersChanged(this.currentFilters, this.hasActiveFilters());
        }
        
        // Dispatch custom event
        window.dispatchEvent(new CustomEvent('filters:changed', {
            detail: {
                filters: this.currentFilters,
                hasActiveFilters: this.hasActiveFilters(),
                summary: this.getFilterSummary()
            }
        }));
    }

    /**
     * Track analytics events
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    trackEvent(event, data = {}) {
        window.dispatchEvent(new CustomEvent('analytics:track', {
            detail: { event, data, timestamp: new Date().toISOString() }
        }));
    }

    /**
     * Export filter state
     * @returns {Object} Filter state
     */
    exportState() {
        return {
            filters: this.currentFilters,
            view: this.currentView,
            availableTags: Array.from(this.availableTags)
        };
    }

    /**
     * Import filter state
     * @param {Object} state - Filter state
     */
    importState(state) {
        if (state.filters) {
            this.currentFilters = { ...DEFAULTS.FILTER, ...state.filters };
        }
        
        if (state.view) {
            this.currentView = state.view;
        }
        
        if (state.availableTags) {
            this.availableTags = new Set(state.availableTags);
        }
        
        this.applyFiltersToUI();
        this.applyViewToUI();
        this.notifyFiltersChanged();
    }

    /**
     * Destroy filter manager
     */
    destroy() {
        // Save current state
        this.saveFilters();
        
        // Clean up
        this.currentFilters = { ...DEFAULTS.FILTER };
        this.availableTags.clear();
        
        console.log('Filter manager destroyed');
    }
}

export default FilterManager;
