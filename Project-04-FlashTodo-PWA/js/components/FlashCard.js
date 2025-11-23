/**
 * FlashCard.js - Flash Card Component
 * 
 * Handles rendering and interactions for individual todo flash cards
 */

import { TODO_STATUS, STATUS_CONFIG, PRIORITY_CONFIG, UTILS } from '../utils/constants.js';

export class FlashCard {
    constructor(todo, options = {}) {
        this.todo = todo;
        this.options = {
            viewMode: 'cards', // 'cards' or 'list'
            onClick: null,
            onEdit: null,
            onDelete: null,
            onStatusChange: null,
            onPriorityChange: null,
            ...options
        };
        
        this.element = null;
        this.isExpanded = false;
    }

    /**
     * Render the flash card
     * @returns {HTMLElement} Card element
     */
    render() {
        this.element = this.createElement();
        this.attachEventListeners();
        this.applyAnimations();
        return this.element;
    }

    /**
     * Create the card HTML element
     * @returns {HTMLElement} Card element
     */
    createElement() {
        const card = document.createElement('div');
        card.className = 'flash-card';
        card.dataset.id = this.todo.id;
        card.dataset.status = this.todo.status;
        card.dataset.priority = this.todo.priority;
        
        // Add folder data if exists
        if (this.todo.folder) {
            card.dataset.folder = this.todo.folder;
        }
        
        card.innerHTML = this.getCardHTML();
        
        return card;
    }

    /**
     * Generate card HTML content
     * @returns {string} HTML content
     */
    getCardHTML() {
        const statusConfig = STATUS_CONFIG[this.todo.status] || STATUS_CONFIG[TODO_STATUS.TODO];
        const priorityConfig = PRIORITY_CONFIG[this.todo.priority] || PRIORITY_CONFIG.MEDIUM;
        
        return `
            <div class="card-header">
                <h3 class="card-title">${UTILS.sanitizeHtml(this.todo.title)}</h3>
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" title="Edit todo">
                        ✏️
                    </button>
                    <button class="card-action-btn delete-btn" title="Delete todo">
                        🗑️
                    </button>
                    <button class="card-action-btn menu-btn" title="More options">
                        ⋯
                    </button>
                </div>
            </div>
            
            ${this.todo.description ? `
                <div class="card-description ${this.isExpanded ? 'expanded' : ''}">
                    ${UTILS.sanitizeHtml(this.todo.description)}
                </div>
                ${this.todo.description.length > 150 ? `
                    <button class="expand-btn" title="${this.isExpanded ? 'Show less' : 'Show more'}">
                        ${this.isExpanded ? 'Show less' : 'Show more'}
                    </button>
                ` : ''}
            ` : ''}
            
            <div class="card-meta">
                <div class="priority-badge ${this.todo.priority}">
                    <span class="priority-icon">${priorityConfig.icon}</span>
                    ${priorityConfig.label}
                </div>
                
                ${this.todo.dueDate ? `
                    <div class="due-date ${this.getDueDateClass()}">
                        <span class="due-icon">📅</span>
                        ${this.formatDueDate()}
                    </div>
                ` : ''}
                
                ${this.todo.folder ? `
                    <div class="folder-badge">
                        <span class="folder-icon">📁</span>
                        ${UTILS.sanitizeHtml(this.todo.folderName || 'Folder')}
                    </div>
                ` : ''}
            </div>
            
            ${this.todo.tags && this.todo.tags.length > 0 ? `
                <div class="card-tags">
                    ${this.todo.tags.map(tag => `
                        <span class="tag">${UTILS.sanitizeHtml(tag)}</span>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="card-footer">
                <div class="status-indicator">
                    <span class="status-dot ${this.todo.status}"></span>
                    <select class="status-select" title="Change status">
                        <option value="${TODO_STATUS.TODO}" ${this.todo.status === TODO_STATUS.TODO ? 'selected' : ''}>
                            📋 Todo
                        </option>
                        <option value="${TODO_STATUS.PROGRESS}" ${this.todo.status === TODO_STATUS.PROGRESS ? 'selected' : ''}>
                            🔄 In Progress
                        </option>
                        <option value="${TODO_STATUS.COMPLETED}" ${this.todo.status === TODO_STATUS.COMPLETED ? 'selected' : ''}>
                            ✅ Completed
                        </option>
                        <option value="${TODO_STATUS.HOLD}" ${this.todo.status === TODO_STATUS.HOLD ? 'selected' : ''}>
                            ⏸️ On Hold
                        </option>
                    </select>
                </div>
                
                <div class="card-timestamp" title="Created: ${this.formatTimestamp(this.todo.createdAt)}">
                    ${this.getRelativeTime()}
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners to card elements
     */
    attachEventListeners() {
        if (!this.element) return;

        // Card click handler
        this.element.addEventListener('click', (e) => {
            // Don't trigger if clicking on interactive elements
            if (e.target.closest('.card-action-btn, .status-select, .expand-btn, .tag')) {
                return;
            }
            
            if (this.options.onClick) {
                this.options.onClick(this.todo, this);
            }
        });

        // Edit button
        const editBtn = this.element.querySelector('.edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.options.onEdit) {
                    this.options.onEdit(this.todo, this);
                }
            });
        }

        // Delete button
        const deleteBtn = this.element.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleDelete();
            });
        }

        // Menu button
        const menuBtn = this.element.querySelector('.menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showContextMenu(e);
            });
        }

        // Status change handler
        const statusSelect = this.element.querySelector('.status-select');
        if (statusSelect) {
            statusSelect.addEventListener('change', (e) => {
                e.stopPropagation();
                this.handleStatusChange(e.target.value);
            });
        }

        // Expand/collapse description
        const expandBtn = this.element.querySelector('.expand-btn');
        if (expandBtn) {
            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDescription();
            });
        }

        // Tag click handlers
        const tagElements = this.element.querySelectorAll('.tag');
        tagElements.forEach(tagEl => {
            tagEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleTagClick(tagEl.textContent);
            });
        });

        // Double-click to edit
        this.element.addEventListener('dblclick', () => {
            if (this.options.onEdit) {
                this.options.onEdit(this.todo, this);
            }
        });

        // Keyboard support
        this.element.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Make card focusable
        this.element.tabIndex = 0;
    }

    /**
     * Handle card deletion with confirmation
     */
    handleDelete() {
        const confirmed = confirm(`Are you sure you want to delete "${this.todo.title}"?`);
        if (confirmed && this.options.onDelete) {
            this.options.onDelete(this.todo, this);
        }
    }

    /**
     * Handle status change
     * @param {string} newStatus - New status value
     */
    handleStatusChange(newStatus) {
        if (newStatus !== this.todo.status) {
            const oldStatus = this.todo.status;
            this.todo.status = newStatus;
            this.todo.updatedAt = new Date().toISOString();
            
            // Add completion timestamp if completing
            if (newStatus === TODO_STATUS.COMPLETED && oldStatus !== TODO_STATUS.COMPLETED) {
                this.todo.completedAt = new Date().toISOString();
            }
            
            // Update visual appearance
            this.updateStatusAppearance();
            
            if (this.options.onStatusChange) {
                this.options.onStatusChange(this.todo, oldStatus, newStatus, this);
            }
        }
    }

    /**
     * Update card appearance based on status
     */
    updateStatusAppearance() {
        if (!this.element) return;
        
        // Update data attribute
        this.element.dataset.status = this.todo.status;
        
        // Update status dot
        const statusDot = this.element.querySelector('.status-dot');
        if (statusDot) {
            statusDot.className = `status-dot ${this.todo.status}`;
        }
        
        // Update title styling for completed tasks
        const title = this.element.querySelector('.card-title');
        if (title) {
            if (this.todo.status === TODO_STATUS.COMPLETED) {
                title.style.textDecoration = 'line-through';
                title.style.opacity = '0.8';
            } else {
                title.style.textDecoration = 'none';
                title.style.opacity = '1';
            }
        }
        
        // Add status change animation
        this.element.classList.add('status-changed');
        setTimeout(() => {
            if (this.element) {
                this.element.classList.remove('status-changed');
            }
        }, 600);
    }

    /**
     * Toggle description expansion
     */
    toggleDescription() {
        this.isExpanded = !this.isExpanded;
        
        const description = this.element.querySelector('.card-description');
        const expandBtn = this.element.querySelector('.expand-btn');
        
        if (description) {
            description.classList.toggle('expanded', this.isExpanded);
        }
        
        if (expandBtn) {
            expandBtn.textContent = this.isExpanded ? 'Show less' : 'Show more';
            expandBtn.title = this.isExpanded ? 'Show less' : 'Show more';
        }
    }

    /**
     * Handle tag click
     * @param {string} tagName - Tag name
     */
    handleTagClick(tagName) {
        // Dispatch tag filter event
        window.dispatchEvent(new CustomEvent('flashcard:tagClicked', {
            detail: { tag: tagName, todo: this.todo }
        }));
    }

    /**
     * Show context menu
     * @param {Event} event - Click event
     */
    showContextMenu(event) {
        // Create context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.innerHTML = `
            <button class="context-menu-item duplicate-btn">
                <span class="icon">📋</span>
                Duplicate
            </button>
            <button class="context-menu-item priority-btn">
                <span class="icon">🔺</span>
                Change Priority
            </button>
            <button class="context-menu-item folder-btn">
                <span class="icon">📁</span>
                Move to Folder
            </button>
            <button class="context-menu-item share-btn">
                <span class="icon">🔗</span>
                Share
            </button>
            <div class="context-menu-separator"></div>
            <button class="context-menu-item delete-btn danger">
                <span class="icon">🗑️</span>
                Delete
            </button>
        `;
        
        // Position menu
        menu.style.position = 'absolute';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.zIndex = '1000';
        
        // Add to body
        document.body.appendChild(menu);
        
        // Handle menu clicks
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item');
            if (action) {
                this.handleContextMenuAction(action.classList[1].replace('-btn', ''));
            }
            document.body.removeChild(menu);
        });
        
        // Remove menu on outside click
        setTimeout(() => {
            const removeMenu = (e) => {
                if (!menu.contains(e.target)) {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', removeMenu);
                }
            };
            document.addEventListener('click', removeMenu);
        }, 0);
    }

    /**
     * Handle context menu actions
     * @param {string} action - Action name
     */
    handleContextMenuAction(action) {
        switch (action) {
            case 'duplicate':
                window.dispatchEvent(new CustomEvent('flashcard:duplicate', {
                    detail: { todo: this.todo }
                }));
                break;
                
            case 'priority':
                this.showPriorityMenu();
                break;
                
            case 'folder':
                window.dispatchEvent(new CustomEvent('flashcard:moveToFolder', {
                    detail: { todo: this.todo }
                }));
                break;
                
            case 'share':
                this.shareTodo();
                break;
                
            case 'delete':
                this.handleDelete();
                break;
        }
    }

    /**
     * Show priority change menu
     */
    showPriorityMenu() {
        const priorities = Object.entries(PRIORITY_CONFIG);
        const menu = document.createElement('div');
        menu.className = 'priority-menu';
        
        menu.innerHTML = priorities.map(([key, config]) => `
            <button class="priority-option ${this.todo.priority === key ? 'active' : ''}" 
                    data-priority="${key}">
                <span class="priority-icon">${config.icon}</span>
                ${config.label}
            </button>
        `).join('');
        
        // Position and show menu
        const rect = this.element.getBoundingClientRect();
        menu.style.position = 'absolute';
        menu.style.left = `${rect.left}px`;
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        // Handle priority selection
        menu.addEventListener('click', (e) => {
            const option = e.target.closest('.priority-option');
            if (option && !option.classList.contains('active')) {
                const newPriority = option.dataset.priority;
                this.changePriority(newPriority);
            }
            document.body.removeChild(menu);
        });
        
        // Auto-remove menu
        setTimeout(() => {
            if (document.body.contains(menu)) {
                document.body.removeChild(menu);
            }
        }, 5000);
    }

    /**
     * Change todo priority
     * @param {string} newPriority - New priority
     */
    changePriority(newPriority) {
        const oldPriority = this.todo.priority;
        this.todo.priority = newPriority;
        this.todo.updatedAt = new Date().toISOString();
        
        // Update visual appearance
        this.updatePriorityAppearance();
        
        if (this.options.onPriorityChange) {
            this.options.onPriorityChange(this.todo, oldPriority, newPriority, this);
        }
    }

    /**
     * Update priority appearance
     */
    updatePriorityAppearance() {
        if (!this.element) return;
        
        this.element.dataset.priority = this.todo.priority;
        
        const priorityBadge = this.element.querySelector('.priority-badge');
        if (priorityBadge) {
            const priorityConfig = PRIORITY_CONFIG[this.todo.priority];
            priorityBadge.className = `priority-badge ${this.todo.priority}`;
            priorityBadge.innerHTML = `
                <span class="priority-icon">${priorityConfig.icon}</span>
                ${priorityConfig.label}
            `;
        }
    }

    /**
     * Share todo
     */
    async shareTodo() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Todo: ${this.todo.title}`,
                    text: this.todo.description || this.todo.title,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback: copy to clipboard
            const text = `${this.todo.title}\n${this.todo.description || ''}`;
            try {
                await navigator.clipboard.writeText(text);
                this.showToast('Todo copied to clipboard!');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
            }
        }
    }

    /**
     * Handle keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeydown(event) {
        switch (event.key) {
            case 'Enter':
            case ' ':
                event.preventDefault();
                if (this.options.onClick) {
                    this.options.onClick(this.todo, this);
                }
                break;
                
            case 'e':
            case 'E':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    if (this.options.onEdit) {
                        this.options.onEdit(this.todo, this);
                    }
                }
                break;
                
            case 'Delete':
            case 'Backspace':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    this.handleDelete();
                }
                break;
        }
    }

    /**
     * Get due date CSS class
     * @returns {string} CSS class name
     */
    getDueDateClass() {
        if (!this.todo.dueDate) return '';
        
        if (UTILS.isOverdue(this.todo.dueDate)) {
            return 'overdue';
        } else if (UTILS.isToday(this.todo.dueDate)) {
            return 'today';
        }
        
        return '';
    }

    /**
     * Format due date for display
     * @returns {string} Formatted date
     */
    formatDueDate() {
        if (!this.todo.dueDate) return '';
        return UTILS.formatDate(this.todo.dueDate);
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        return UTILS.formatDate(timestamp, 'MMMM DD, YYYY h:mm A');
    }

    /**
     * Get relative time string
     * @returns {string} Relative time
     */
    getRelativeTime() {
        const now = new Date();
        const created = new Date(this.todo.createdAt);
        const diffInMs = now - created;
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays < 30) return `${diffInDays}d ago`;
        
        return this.formatTimestamp(this.todo.createdAt);
    }

    /**
     * Apply entrance animations
     */
    applyAnimations() {
        if (this.element) {
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(20px) scale(0.95)';
            
            // Animate in
            requestAnimationFrame(() => {
                this.element.style.transition = 'all 0.3s ease-out';
                this.element.style.opacity = '1';
                this.element.style.transform = 'translateY(0) scale(1)';
            });
        }
    }

    /**
     * Show toast notification
     * @param {string} message - Toast message
     */
    showToast(message) {
        window.dispatchEvent(new CustomEvent('flashcard:toast', {
            detail: { message, type: 'info' }
        }));
    }

    /**
     * Update todo data
     * @param {Object} newTodo - Updated todo data
     */
    update(newTodo) {
        this.todo = { ...this.todo, ...newTodo };
        
        if (this.element) {
            // Re-render the card with new data
            const newElement = this.createElement();
            this.element.replaceWith(newElement);
            this.element = newElement;
            this.attachEventListeners();
        }
    }

    /**
     * Destroy the card and clean up
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    /**
     * Get card element
     * @returns {HTMLElement} Card element
     */
    getElement() {
        return this.element;
    }

    /**
     * Check if card matches filter criteria
     * @param {Object} filters - Filter criteria
     * @returns {boolean} True if matches
     */
    matchesFilters(filters) {
        // Status filter
        if (filters.status && filters.status !== 'all' && this.todo.status !== filters.status) {
            return false;
        }
        
        // Priority filter
        if (filters.priority && filters.priority !== 'all' && this.todo.priority !== filters.priority) {
            return false;
        }
        
        // Folder filter
        if (filters.folder && filters.folder !== 'all' && this.todo.folder !== filters.folder) {
            return false;
        }
        
        // Search filter
        if (filters.search) {
            const searchTerm = filters.search.toLowerCase();
            const searchableText = [
                this.todo.title,
                this.todo.description,
                ...(this.todo.tags || [])
            ].join(' ').toLowerCase();
            
            if (!searchableText.includes(searchTerm)) {
                return false;
            }
        }
        
        // Tag filter
        if (filters.tags && filters.tags.length > 0) {
            const todoTags = this.todo.tags || [];
            if (!filters.tags.some(tag => todoTags.includes(tag))) {
                return false;
            }
        }
        
        return true;
    }
}

export default FlashCard;
