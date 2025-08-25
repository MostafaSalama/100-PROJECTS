/**
 * NotificationService.js - Notification Service Implementation
 * 
 * Handles user notifications, alerts, and feedback messages.
 * Provides different notification types and persistence.
 */

export class NotificationService {
    constructor(containerId = 'notificationContainer') {
        this.containerId = containerId;
        this.notifications = new Map();
        this.defaultDuration = 5000; // 5 seconds
        this.maxNotifications = 5;
        this.notificationTypes = {
            success: { icon: '✅', className: 'notification-success' },
            error: { icon: '❌', className: 'notification-error' },
            warning: { icon: '⚠️', className: 'notification-warning' },
            info: { icon: 'ℹ️', className: 'notification-info' },
            task: { icon: '📝', className: 'notification-task' }
        };
        
        this.initialize();
    }

    /**
     * Initialize notification service
     */
    initialize() {
        this.createNotificationContainer();
        this.loadPersistedNotifications();
    }

    /**
     * Create notification container if it doesn't exist
     */
    createNotificationContainer() {
        let container = document.getElementById(this.containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'notification-container';
            document.body.appendChild(container);
        }
        
        // Add CSS if not already present
        this.injectNotificationStyles();
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    show(message, type = 'info', options = {}) {
        const notification = this.createNotification(message, type, options);
        this.displayNotification(notification);
        
        // Auto-remove after duration (if not persistent)
        if (!notification.persistent && notification.duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, notification.duration);
        }
        
        // Limit number of notifications
        this.limitNotifications();
        
        return notification.id;
    }

    /**
     * Show success notification
     * @param {string} message - Success message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show error notification
     * @param {string} message - Error message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    error(message, options = {}) {
        return this.show(message, 'error', { 
            ...options, 
            duration: options.duration || 8000, // Longer duration for errors
            persistent: options.persistent || false 
        });
    }

    /**
     * Show warning notification
     * @param {string} message - Warning message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show info notification
     * @param {string} message - Info message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show task-related notification
     * @param {string} message - Task message
     * @param {Object} options - Additional options
     * @returns {string} Notification ID
     */
    task(message, options = {}) {
        return this.show(message, 'task', options);
    }

    /**
     * Create notification object
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     * @param {Object} options - Additional options
     * @returns {Object} Notification object
     */
    createNotification(message, type, options = {}) {
        const id = this.generateNotificationId();
        const typeConfig = this.notificationTypes[type] || this.notificationTypes.info;
        
        return {
            id: id,
            message: message,
            type: type,
            icon: options.icon || typeConfig.icon,
            className: typeConfig.className,
            duration: options.duration !== undefined ? options.duration : this.defaultDuration,
            persistent: options.persistent || false,
            closable: options.closable !== false, // Default true
            actions: options.actions || [],
            data: options.data || {},
            timestamp: new Date(),
            read: false
        };
    }

    /**
     * Display notification in UI
     * @param {Object} notification - Notification object
     */
    displayNotification(notification) {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Notification container not found');
            return;
        }

        // Create notification element
        const notificationElement = this.createNotificationElement(notification);
        
        // Add to container (prepend for newest first)
        container.insertBefore(notificationElement, container.firstChild);
        
        // Store notification
        this.notifications.set(notification.id, notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notificationElement.classList.add('notification-show');
        });
        
        // Emit event
        this.emit('notificationShown', { notification });
    }

    /**
     * Create notification DOM element
     * @param {Object} notification - Notification object
     * @returns {HTMLElement} Notification element
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.className}`;
        element.setAttribute('data-notification-id', notification.id);
        
        // Build notification content
        let actionsHtml = '';
        if (notification.actions.length > 0) {
            actionsHtml = `
                <div class="notification-actions">
                    ${notification.actions.map(action => `
                        <button class="notification-action-btn" data-action="${action.id}">
                            ${action.icon ? `<span class="action-icon">${action.icon}</span>` : ''}
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            `;
        }
        
        element.innerHTML = `
            <div class="notification-content">
                <div class="notification-header">
                    <span class="notification-icon">${notification.icon}</span>
                    <div class="notification-message">${notification.message}</div>
                    ${notification.closable ? '<button class="notification-close" aria-label="Close">✕</button>' : ''}
                </div>
                ${actionsHtml}
                <div class="notification-meta">
                    <span class="notification-time">${this.formatTime(notification.timestamp)}</span>
                    ${notification.persistent ? '<span class="notification-persistent-badge">Persistent</span>' : ''}
                </div>
            </div>
            <div class="notification-progress"></div>
        `;
        
        // Add event listeners
        this.addNotificationEventListeners(element, notification);
        
        // Start progress bar animation (if not persistent)
        if (!notification.persistent && notification.duration > 0) {
            this.animateProgressBar(element, notification.duration);
        }
        
        return element;
    }

    /**
     * Add event listeners to notification element
     * @param {HTMLElement} element - Notification element
     * @param {Object} notification - Notification object
     */
    addNotificationEventListeners(element, notification) {
        // Close button
        const closeBtn = element.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.remove(notification.id);
            });
        }
        
        // Action buttons
        const actionBtns = element.querySelectorAll('.notification-action-btn');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const actionId = btn.getAttribute('data-action');
                const action = notification.actions.find(a => a.id === actionId);
                
                if (action && action.callback) {
                    action.callback(notification);
                }
                
                // Remove notification if action should close it
                if (!action || action.closeOnClick !== false) {
                    this.remove(notification.id);
                }
            });
        });
        
        // Click to mark as read
        element.addEventListener('click', () => {
            this.markAsRead(notification.id);
        });
        
        // Hover to pause auto-removal
        let removalTimeout;
        element.addEventListener('mouseenter', () => {
            if (removalTimeout) {
                clearTimeout(removalTimeout);
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (!notification.persistent && notification.duration > 0) {
                removalTimeout = setTimeout(() => {
                    this.remove(notification.id);
                }, 2000); // Grace period
            }
        });
    }

    /**
     * Animate progress bar
     * @param {HTMLElement} element - Notification element
     * @param {number} duration - Duration in milliseconds
     */
    animateProgressBar(element, duration) {
        const progressBar = element.querySelector('.notification-progress');
        if (!progressBar) return;
        
        progressBar.style.transition = `width ${duration}ms linear`;
        progressBar.style.width = '0%';
    }

    /**
     * Remove notification
     * @param {string} id - Notification ID
     * @returns {boolean} Success status
     */
    remove(id) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return false;
        }
        
        const element = document.querySelector(`[data-notification-id="${id}"]`);
        if (element) {
            // Animate out
            element.classList.add('notification-hide');
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300); // Animation duration
        }
        
        // Remove from storage
        this.notifications.delete(id);
        
        // Emit event
        this.emit('notificationRemoved', { id, notification });
        
        return true;
    }

    /**
     * Remove all notifications
     */
    clear() {
        const ids = Array.from(this.notifications.keys());
        ids.forEach(id => this.remove(id));
    }

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    markAsRead(id) {
        const notification = this.notifications.get(id);
        if (notification && !notification.read) {
            notification.read = true;
            
            const element = document.querySelector(`[data-notification-id="${id}"]`);
            if (element) {
                element.classList.add('notification-read');
            }
            
            this.emit('notificationRead', { id, notification });
        }
    }

    /**
     * Get all notifications
     * @returns {Array} Array of notifications
     */
    getAll() {
        return Array.from(this.notifications.values());
    }

    /**
     * Get unread notifications
     * @returns {Array} Array of unread notifications
     */
    getUnread() {
        return this.getAll().filter(notification => !notification.read);
    }

    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @returns {Object|null} Notification object or null
     */
    getById(id) {
        return this.notifications.get(id) || null;
    }

    /**
     * Show confirmation dialog
     * @param {string} message - Confirmation message
     * @param {Object} options - Dialog options
     * @returns {Promise<boolean>} User confirmation
     */
    confirm(message, options = {}) {
        return new Promise((resolve) => {
            const actions = [
                {
                    id: 'cancel',
                    label: options.cancelLabel || 'Cancel',
                    icon: '✕',
                    callback: () => resolve(false),
                    closeOnClick: true
                },
                {
                    id: 'confirm',
                    label: options.confirmLabel || 'Confirm',
                    icon: '✓',
                    callback: () => resolve(true),
                    closeOnClick: true
                }
            ];
            
            this.show(message, 'warning', {
                ...options,
                persistent: true,
                actions: actions,
                closable: false
            });
        });
    }

    /**
     * Show task completion notification
     * @param {Object} task - Task object
     * @param {Object} options - Additional options
     */
    taskCompleted(task, options = {}) {
        const message = `Task "${task.title}" has been completed! 🎉`;
        const actions = [
            {
                id: 'undo',
                label: 'Undo',
                icon: '↶',
                callback: (notification) => {
                    this.emit('undoTaskCompletion', { task });
                }
            }
        ];
        
        this.success(message, {
            ...options,
            actions: actions,
            data: { taskId: task.id }
        });
    }

    /**
     * Show task overdue notification
     * @param {Array} overdueTasks - Array of overdue tasks
     * @param {Object} options - Additional options
     */
    tasksOverdue(overdueTasks, options = {}) {
        const count = overdueTasks.length;
        const message = `You have ${count} overdue task${count > 1 ? 's' : ''}`;
        
        const actions = [
            {
                id: 'view',
                label: 'View Tasks',
                icon: '👀',
                callback: () => {
                    this.emit('viewOverdueTasks', { tasks: overdueTasks });
                }
            }
        ];
        
        this.warning(message, {
            ...options,
            actions: actions,
            data: { overdueTasks }
        });
    }

    /**
     * Show bulk operation result
     * @param {string} operation - Operation type
     * @param {number} count - Number of affected items
     * @param {Object} options - Additional options
     */
    bulkOperation(operation, count, options = {}) {
        const messages = {
            deleted: `Successfully deleted ${count} task${count > 1 ? 's' : ''}`,
            completed: `Marked ${count} task${count > 1 ? 's' : ''} as completed`,
            updated: `Updated ${count} task${count > 1 ? 's' : ''}`
        };
        
        const message = messages[operation] || `Bulk operation completed on ${count} items`;
        this.success(message, options);
    }

    /**
     * Generate unique notification ID
     * @returns {string} Unique ID
     */
    generateNotificationId() {
        return `notification_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    /**
     * Format timestamp for display
     * @param {Date} timestamp - Timestamp to format
     * @returns {string} Formatted time
     */
    formatTime(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (seconds < 60) {
            return 'Just now';
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else {
            return timestamp.toLocaleDateString();
        }
    }

    /**
     * Limit number of visible notifications
     */
    limitNotifications() {
        const notifications = Array.from(this.notifications.values())
            .sort((a, b) => b.timestamp - a.timestamp);
        
        if (notifications.length > this.maxNotifications) {
            const excess = notifications.slice(this.maxNotifications);
            excess.forEach(notification => {
                if (!notification.persistent) {
                    this.remove(notification.id);
                }
            });
        }
    }

    /**
     * Load persisted notifications (if any)
     */
    loadPersistedNotifications() {
        try {
            const stored = localStorage.getItem('taskmaster_notifications');
            if (stored) {
                const notifications = JSON.parse(stored);
                notifications.forEach(notificationData => {
                    if (notificationData.persistent) {
                        const notification = {
                            ...notificationData,
                            timestamp: new Date(notificationData.timestamp)
                        };
                        this.notifications.set(notification.id, notification);
                        this.displayNotification(notification);
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load persisted notifications:', error);
        }
    }

    /**
     * Persist important notifications
     */
    persistNotifications() {
        try {
            const persistentNotifications = this.getAll()
                .filter(notification => notification.persistent)
                .map(notification => ({
                    ...notification,
                    timestamp: notification.timestamp.toISOString()
                }));
            
            localStorage.setItem('taskmaster_notifications', JSON.stringify(persistentNotifications));
        } catch (error) {
            console.error('Failed to persist notifications:', error);
        }
    }

    /**
     * Inject notification styles
     */
    injectNotificationStyles() {
        if (document.getElementById('notification-styles')) {
            return;
        }
        
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                pointer-events: none;
            }
            
            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                overflow: hidden;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
                pointer-events: auto;
                position: relative;
                border-left: 4px solid #ccc;
            }
            
            .notification-show {
                opacity: 1;
                transform: translateX(0);
            }
            
            .notification-hide {
                opacity: 0;
                transform: translateX(100%);
                max-height: 0;
                margin-bottom: 0;
            }
            
            .notification-success { border-left-color: #10b981; }
            .notification-error { border-left-color: #ef4444; }
            .notification-warning { border-left-color: #f59e0b; }
            .notification-info { border-left-color: #3b82f6; }
            .notification-task { border-left-color: #8b5cf6; }
            
            .notification-content {
                padding: 16px;
            }
            
            .notification-header {
                display: flex;
                align-items: flex-start;
                gap: 12px;
            }
            
            .notification-icon {
                font-size: 18px;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .notification-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
                color: #374151;
            }
            
            .notification-close {
                background: none;
                border: none;
                font-size: 16px;
                color: #9ca3af;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .notification-close:hover {
                background: #f3f4f6;
                color: #374151;
            }
            
            .notification-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
            }
            
            .notification-action-btn {
                background: #f9fafb;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 6px 12px;
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                transition: all 0.2s ease;
            }
            
            .notification-action-btn:hover {
                background: #f3f4f6;
                border-color: #9ca3af;
            }
            
            .notification-meta {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 8px;
                font-size: 11px;
                color: #9ca3af;
            }
            
            .notification-persistent-badge {
                background: #fef3c7;
                color: #92400e;
                padding: 2px 6px;
                border-radius: 10px;
                font-size: 10px;
                font-weight: 500;
            }
            
            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 3px;
                width: 100%;
                background: rgba(0, 0, 0, 0.1);
            }
            
            .notification-read {
                opacity: 0.7;
            }
            
            @media (max-width: 768px) {
                .notification-container {
                    top: 10px;
                    right: 10px;
                    left: 10px;
                    max-width: none;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Simple event emitter
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        const customEvent = new CustomEvent(`notification:${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(customEvent);
        }
    }

    /**
     * Get notification statistics
     * @returns {Object} Notification statistics
     */
    getStats() {
        const all = this.getAll();
        const unread = this.getUnread();
        
        const byType = {};
        all.forEach(notification => {
            byType[notification.type] = (byType[notification.type] || 0) + 1;
        });
        
        return {
            total: all.length,
            unread: unread.length,
            byType: byType,
            persistent: all.filter(n => n.persistent).length
        };
    }
}

export default NotificationService;
