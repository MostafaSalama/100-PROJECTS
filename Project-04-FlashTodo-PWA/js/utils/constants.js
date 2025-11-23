/**
 * constants.js - FlashTodo PWA Constants
 * 
 * Application-wide constants, configuration, and enums
 */

// ===== APP INFO =====
export const APP_INFO = {
    NAME: 'FlashTodo',
    VERSION: '1.0.0',
    DESCRIPTION: 'Flash Card Todo App with Color-Coded Statuses',
    AUTHOR: 'Mostafa Salama',
    STORAGE_KEY: 'flashtodo_data',
    BACKUP_KEY: 'flashtodo_backup'
};

// ===== TODO STATUSES =====
export const TODO_STATUS = {
    TODO: 'todo',
    PROGRESS: 'progress', 
    COMPLETED: 'completed',
    HOLD: 'hold'
};

export const STATUS_CONFIG = {
    [TODO_STATUS.TODO]: {
        label: 'Todo',
        icon: '📋',
        color: '#667eea',
        lightColor: 'rgba(102, 126, 234, 0.1)',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: 'Tasks that need to be started'
    },
    [TODO_STATUS.PROGRESS]: {
        label: 'In Progress',
        icon: '🔄',
        color: '#f093fb',
        lightColor: 'rgba(240, 147, 251, 0.1)',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: 'Tasks currently being worked on'
    },
    [TODO_STATUS.COMPLETED]: {
        label: 'Completed',
        icon: '✅',
        color: '#4facfe',
        lightColor: 'rgba(79, 172, 254, 0.1)',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        description: 'Tasks that have been finished'
    },
    [TODO_STATUS.HOLD]: {
        label: 'On Hold',
        icon: '⏸️',
        color: '#8360c3',
        lightColor: 'rgba(131, 96, 195, 0.1)',
        gradient: 'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)',
        description: 'Tasks temporarily paused'
    }
};

// ===== PRIORITY LEVELS =====
export const PRIORITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

export const PRIORITY_CONFIG = {
    [PRIORITY.LOW]: {
        label: 'Low',
        icon: '🟢',
        color: '#48cfad',
        value: 1
    },
    [PRIORITY.MEDIUM]: {
        label: 'Medium',
        icon: '🟡',
        color: '#ffce54',
        value: 2
    },
    [PRIORITY.HIGH]: {
        label: 'High',
        icon: '🔴',
        color: '#ff6b6b',
        value: 3
    }
};

// ===== VIEW MODES =====
export const VIEW_MODE = {
    CARDS: 'cards',
    LIST: 'list'
};

// ===== DEFAULT VALUES =====
export const DEFAULTS = {
    TODO: {
        status: TODO_STATUS.TODO,
        priority: PRIORITY.MEDIUM,
        folder: null,
        tags: [],
        description: '',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    FOLDER: {
        name: '',
        icon: '📁',
        createdAt: new Date().toISOString(),
        color: '#667eea'
    },
    FILTER: {
        status: 'all',
        priority: 'all',
        folder: 'all',
        search: '',
        tags: []
    },
    SETTINGS: {
        viewMode: VIEW_MODE.CARDS,
        theme: 'dark',
        autoSave: true,
        notifications: true,
        soundEnabled: false
    }
};

// ===== VALIDATION RULES =====
export const VALIDATION = {
    TODO: {
        title: {
            required: true,
            minLength: 1,
            maxLength: 200
        },
        description: {
            required: false,
            maxLength: 1000
        },
        tags: {
            required: false,
            maxCount: 10,
            maxLength: 30
        }
    },
    FOLDER: {
        name: {
            required: true,
            minLength: 1,
            maxLength: 50
        },
        icon: {
            required: false,
            maxLength: 2
        }
    }
};

// ===== STORAGE SETTINGS =====
export const STORAGE = {
    AUTO_SAVE_INTERVAL: 5000, // 5 seconds
    BACKUP_INTERVAL: 60000, // 1 minute
    MAX_BACKUP_COUNT: 5,
    SYNC_DEBOUNCE: 1000 // 1 second
};

// ===== UI CONSTANTS =====
export const UI = {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 500,
    TOAST_DURATION: 4000,
    MAX_SEARCH_RESULTS: 100,
    CARDS_PER_PAGE: 20,
    MODAL_TRANSITION: 300
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
    VALIDATION: {
        REQUIRED_FIELD: 'This field is required',
        MIN_LENGTH: 'Minimum {min} characters required',
        MAX_LENGTH: 'Maximum {max} characters allowed',
        INVALID_FORMAT: 'Invalid format'
    },
    STORAGE: {
        SAVE_FAILED: 'Failed to save data',
        LOAD_FAILED: 'Failed to load data',
        QUOTA_EXCEEDED: 'Storage quota exceeded'
    },
    NETWORK: {
        OFFLINE: 'You are currently offline',
        SYNC_FAILED: 'Sync failed - will retry when online'
    },
    GENERAL: {
        UNKNOWN_ERROR: 'An unknown error occurred',
        ACTION_FAILED: 'Action could not be completed'
    }
};

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
    TODO: {
        CREATED: 'Todo created successfully!',
        UPDATED: 'Todo updated successfully!',
        DELETED: 'Todo deleted successfully!',
        STATUS_CHANGED: 'Todo status updated!'
    },
    FOLDER: {
        CREATED: 'Folder created successfully!',
        UPDATED: 'Folder updated successfully!',
        DELETED: 'Folder deleted successfully!'
    },
    SYNC: {
        COMPLETE: 'Data synced successfully!',
        OFFLINE_SAVED: 'Changes saved offline - will sync when connected'
    }
};

// ===== KEYBOARD SHORTCUTS =====
export const SHORTCUTS = {
    ADD_TODO: 'n',
    SEARCH: '/',
    TOGGLE_VIEW: 'v',
    FOCUS_SEARCH: 'f',
    SHOW_HELP: '?',
    ESCAPE: 'Escape'
};

// ===== FILTER OPTIONS =====
export const FILTER_OPTIONS = {
    STATUS: [
        { value: 'all', label: 'All Statuses', icon: '📋' },
        { value: TODO_STATUS.TODO, label: 'Todo', icon: '📋' },
        { value: TODO_STATUS.PROGRESS, label: 'In Progress', icon: '🔄' },
        { value: TODO_STATUS.COMPLETED, label: 'Completed', icon: '✅' },
        { value: TODO_STATUS.HOLD, label: 'On Hold', icon: '⏸️' }
    ],
    PRIORITY: [
        { value: 'all', label: 'All Priorities', icon: '🔘' },
        { value: PRIORITY.HIGH, label: 'High', icon: '🔴' },
        { value: PRIORITY.MEDIUM, label: 'Medium', icon: '🟡' },
        { value: PRIORITY.LOW, label: 'Low', icon: '🟢' }
    ]
};

// ===== DATE UTILITIES =====
export const DATE_FORMATS = {
    DISPLAY: 'MMM DD, YYYY',
    FULL: 'MMMM DD, YYYY h:mm A',
    TIME: 'h:mm A',
    ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ'
};

// ===== EVENTS =====
export const EVENTS = {
    TODO_CREATED: 'todo:created',
    TODO_UPDATED: 'todo:updated',
    TODO_DELETED: 'todo:deleted',
    TODO_STATUS_CHANGED: 'todo:status_changed',
    FOLDER_CREATED: 'folder:created',
    FOLDER_UPDATED: 'folder:updated',
    FOLDER_DELETED: 'folder:deleted',
    FILTER_CHANGED: 'filter:changed',
    VIEW_CHANGED: 'view:changed',
    SEARCH_CHANGED: 'search:changed',
    SYNC_START: 'sync:start',
    SYNC_COMPLETE: 'sync:complete',
    SYNC_ERROR: 'sync:error',
    OFFLINE: 'app:offline',
    ONLINE: 'app:online'
};

// ===== PWA SETTINGS =====
export const PWA = {
    CACHE_VERSION: 'v1.0.0',
    STATIC_CACHE_NAME: 'flashtodo-static-v1',
    DYNAMIC_CACHE_NAME: 'flashtodo-dynamic-v1',
    INSTALL_PROMPT_DELAY: 3000, // 3 seconds
    UPDATE_CHECK_INTERVAL: 300000 // 5 minutes
};

// ===== FEATURE FLAGS =====
export const FEATURES = {
    OFFLINE_SUPPORT: true,
    BACKGROUND_SYNC: true,
    PUSH_NOTIFICATIONS: false,
    COLLABORATION: false,
    ANALYTICS: false,
    EXPORT_IMPORT: true,
    KEYBOARD_SHORTCUTS: true,
    THEMES: false
};

// ===== ANALYTICS EVENTS =====
export const ANALYTICS = {
    TODO_CREATED: 'todo_created',
    TODO_COMPLETED: 'todo_completed',
    TODO_DELETED: 'todo_deleted',
    FOLDER_CREATED: 'folder_created',
    VIEW_CHANGED: 'view_changed',
    FILTER_APPLIED: 'filter_applied',
    SEARCH_PERFORMED: 'search_performed',
    APP_INSTALLED: 'app_installed',
    SHORTCUT_USED: 'shortcut_used'
};

// ===== UTILITY FUNCTIONS =====
export const UTILS = {
    /**
     * Generate unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    },

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @param {string} format - Format string
     * @returns {string} Formatted date
     */
    formatDate(date, format = DATE_FORMATS.DISPLAY) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };

        if (format === DATE_FORMATS.FULL) {
            options.hour = 'numeric';
            options.minute = '2-digit';
        }

        return d.toLocaleDateString('en-US', options);
    },

    /**
     * Check if date is today
     * @param {Date|string} date - Date to check
     * @returns {boolean} True if today
     */
    isToday(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    },

    /**
     * Check if date is overdue
     * @param {Date|string} date - Date to check
     * @returns {boolean} True if overdue
     */
    isOverdue(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d < today;
    },

    /**
     * Sanitize HTML string
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Debounce function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Limit in ms
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// ===== EXPORT ALL =====
export default {
    APP_INFO,
    TODO_STATUS,
    STATUS_CONFIG,
    PRIORITY,
    PRIORITY_CONFIG,
    VIEW_MODE,
    DEFAULTS,
    VALIDATION,
    STORAGE,
    UI,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    SHORTCUTS,
    FILTER_OPTIONS,
    DATE_FORMATS,
    EVENTS,
    PWA,
    FEATURES,
    ANALYTICS,
    UTILS
};
