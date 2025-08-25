/**
 * constants.js - Application Constants
 * 
 * Defines all constants used throughout the TaskMaster application.
 * Centralized configuration for easy maintenance and updates.
 */

// ===== TASK CONSTANTS =====
export const TASK_TYPES = {
    WORK: 'work',
    PERSONAL: 'personal',
    PROJECT: 'project',
    REMINDER: 'reminder',
    MEETING: 'meeting',
    GOAL: 'goal'
};

export const TASK_PRIORITIES = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
};

export const TASK_STATUSES = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

// ===== VIEW MODES =====
export const VIEW_MODES = {
    CARD: 'card',
    LIST: 'list',
    KANBAN: 'kanban'
};

// ===== SORT OPTIONS =====
export const SORT_OPTIONS = {
    CREATED_DESC: 'created-desc',
    CREATED_ASC: 'created-asc',
    TITLE_ASC: 'title-asc',
    TITLE_DESC: 'title-desc',
    PRIORITY_DESC: 'priority-desc',
    PRIORITY_ASC: 'priority-asc',
    DUE_DATE_ASC: 'due-date-asc',
    DUE_DATE_DESC: 'due-date-desc',
    STATUS_ASC: 'status-asc',
    PROGRESS: 'progress'
};

// ===== DATE FILTER OPTIONS =====
export const DATE_FILTERS = {
    ALL: 'all',
    TODAY: 'today',
    TOMORROW: 'tomorrow',
    THIS_WEEK: 'this-week',
    NEXT_WEEK: 'next-week',
    OVERDUE: 'overdue',
    NO_DATE: 'no-date'
};

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    TASK: 'task'
};

// ===== LOCAL STORAGE KEYS =====
export const STORAGE_KEYS = {
    TASKS: 'taskmaster_tasks',
    TASKS_BACKUP: 'taskmaster_tasks_backup',
    METADATA: 'taskmaster_metadata',
    FILTER_PRESETS: 'taskmaster_filter_presets',
    ACTIVE_FILTERS: 'taskmaster_active_filters',
    USER_PREFERENCES: 'taskmaster_user_preferences',
    WELCOMED: 'taskmaster_welcomed',
    NOTIFICATIONS: 'taskmaster_notifications'
};

// ===== APPLICATION SETTINGS =====
export const APP_SETTINGS = {
    // Pagination
    DEFAULT_TASKS_PER_PAGE: 10,
    MAX_TASKS_PER_PAGE: 50,
    
    // Search
    SEARCH_DEBOUNCE_DELAY: 300, // milliseconds
    MIN_SEARCH_LENGTH: 2,
    
    // Notifications
    DEFAULT_NOTIFICATION_DURATION: 5000, // milliseconds
    ERROR_NOTIFICATION_DURATION: 8000,
    MAX_NOTIFICATIONS: 5,
    
    // Auto-save
    AUTO_SAVE_INTERVAL: 30000, // 30 seconds
    
    // Backup
    MAX_BACKUPS: 5,
    
    // Performance
    ANIMATION_DURATION: 300, // milliseconds
    DEBOUNCE_DELAY: 250,
    
    // Validation
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_TAGS: 20,
    MAX_TAG_LENGTH: 30,
    MIN_TITLE_LENGTH: 1,
    
    // Progress
    MIN_PROGRESS: 0,
    MAX_PROGRESS: 100,
    
    // Time estimation
    MAX_ESTIMATED_MINUTES: 10080, // 1 week
    MIN_ESTIMATED_MINUTES: 0
};

// ===== UI CONSTANTS =====
export const UI_CONSTANTS = {
    // Z-Index layers
    Z_INDEX: {
        DROPDOWN: 1000,
        STICKY: 1020,
        FIXED: 1030,
        MODAL_BACKDROP: 1040,
        MODAL: 1050,
        POPOVER: 1060,
        TOOLTIP: 1070,
        NOTIFICATION: 1080
    },
    
    // Breakpoints (pixels)
    BREAKPOINTS: {
        MOBILE: 480,
        TABLET: 768,
        DESKTOP: 1024,
        LARGE_DESKTOP: 1200
    },
    
    // Animation timing
    TRANSITIONS: {
        FAST: '150ms',
        BASE: '250ms',
        SLOW: '350ms'
    },
    
    // Color themes
    COLORS: {
        PRIMARY: '#667eea',
        SECONDARY: '#764ba2',
        SUCCESS: '#10b981',
        ERROR: '#ef4444',
        WARNING: '#f59e0b',
        INFO: '#3b82f6'
    }
};

// ===== TASK TYPE CONFIGURATIONS =====
export const TASK_TYPE_CONFIG = {
    [TASK_TYPES.WORK]: {
        icon: '🏢',
        color: '#2563eb',
        defaultPriority: TASK_PRIORITIES.MEDIUM,
        fields: ['projectName', 'clientName', 'billableHours', 'assignedTo'],
        templates: ['meeting', 'development', 'review', 'deployment', 'client-call']
    },
    [TASK_TYPES.PERSONAL]: {
        icon: '👤',
        color: '#10b981',
        defaultPriority: TASK_PRIORITIES.MEDIUM,
        fields: ['category', 'energyLevel', 'motivationLevel', 'healthImpact'],
        templates: ['exercise', 'meditation', 'learning', 'household', 'social']
    },
    [TASK_TYPES.PROJECT]: {
        icon: '📂',
        color: '#8b5cf6',
        defaultPriority: TASK_PRIORITIES.HIGH,
        fields: ['projectName', 'milestone', 'dependencies', 'assignees', 'storyPoints'],
        templates: ['feature', 'bug-fix', 'research', 'deployment']
    },
    [TASK_TYPES.REMINDER]: {
        icon: '⏰',
        color: '#f59e0b',
        defaultPriority: TASK_PRIORITIES.LOW,
        fields: ['reminderType', 'recurring'],
        requiresDueDate: true
    },
    [TASK_TYPES.MEETING]: {
        icon: '👥',
        color: '#ef4444',
        defaultPriority: TASK_PRIORITIES.HIGH,
        fields: ['attendees', 'location', 'agenda'],
        requiresDueDate: true
    },
    [TASK_TYPES.GOAL]: {
        icon: '🎯',
        color: '#06b6d4',
        defaultPriority: TASK_PRIORITIES.MEDIUM,
        fields: ['category', 'targetDate', 'milestones', 'metrics']
    }
};

// ===== PRIORITY CONFIGURATIONS =====
export const PRIORITY_CONFIG = {
    [TASK_PRIORITIES.LOW]: {
        icon: '🟢',
        color: '#10b981',
        weight: 1,
        label: 'Low Priority'
    },
    [TASK_PRIORITIES.MEDIUM]: {
        icon: '🟡',
        color: '#f59e0b',
        weight: 2,
        label: 'Medium Priority'
    },
    [TASK_PRIORITIES.HIGH]: {
        icon: '🔴',
        color: '#ef4444',
        weight: 3,
        label: 'High Priority'
    }
};

// ===== STATUS CONFIGURATIONS =====
export const STATUS_CONFIG = {
    [TASK_STATUSES.PENDING]: {
        icon: '⏳',
        color: '#6b7280',
        label: 'Pending',
        order: 1
    },
    [TASK_STATUSES.IN_PROGRESS]: {
        icon: '⚡',
        color: '#f59e0b',
        label: 'In Progress',
        order: 2
    },
    [TASK_STATUSES.COMPLETED]: {
        icon: '✅',
        color: '#10b981',
        label: 'Completed',
        order: 3
    },
    [TASK_STATUSES.CANCELLED]: {
        icon: '❌',
        color: '#ef4444',
        label: 'Cancelled',
        order: 4
    }
};

// ===== VALIDATION RULES =====
export const VALIDATION_RULES = {
    REQUIRED_FIELDS: ['title', 'type'],
    
    TITLE: {
        required: true,
        minLength: APP_SETTINGS.MIN_TITLE_LENGTH,
        maxLength: APP_SETTINGS.MAX_TITLE_LENGTH,
        pattern: null,
        sanitize: true
    },
    
    DESCRIPTION: {
        required: false,
        maxLength: APP_SETTINGS.MAX_DESCRIPTION_LENGTH,
        sanitize: true
    },
    
    PROGRESS: {
        required: false,
        type: 'number',
        min: APP_SETTINGS.MIN_PROGRESS,
        max: APP_SETTINGS.MAX_PROGRESS
    },
    
    ESTIMATED_MINUTES: {
        required: false,
        type: 'number',
        min: APP_SETTINGS.MIN_ESTIMATED_MINUTES,
        max: APP_SETTINGS.MAX_ESTIMATED_MINUTES
    },
    
    TAGS: {
        required: false,
        type: 'array',
        maxLength: APP_SETTINGS.MAX_TAGS,
        itemValidation: {
            type: 'string',
            maxLength: APP_SETTINGS.MAX_TAG_LENGTH,
            pattern: /^[a-zA-Z0-9-_\s]+$/
        }
    }
};

// ===== ERROR MESSAGES =====
export const ERROR_MESSAGES = {
    REQUIRED_FIELD: 'This field is required',
    INVALID_TYPE: 'Invalid task type',
    INVALID_PRIORITY: 'Invalid priority level',
    INVALID_STATUS: 'Invalid status',
    TITLE_TOO_LONG: `Title cannot exceed ${APP_SETTINGS.MAX_TITLE_LENGTH} characters`,
    TITLE_TOO_SHORT: 'Title must be at least 1 character',
    DESCRIPTION_TOO_LONG: `Description cannot exceed ${APP_SETTINGS.MAX_DESCRIPTION_LENGTH} characters`,
    INVALID_PROGRESS: 'Progress must be between 0 and 100',
    INVALID_DATE: 'Invalid date format',
    INVALID_TIME_ESTIMATE: 'Time estimate must be a positive number',
    TOO_MANY_TAGS: `Cannot have more than ${APP_SETTINGS.MAX_TAGS} tags`,
    INVALID_TAG: 'Tag contains invalid characters',
    STORAGE_ERROR: 'Failed to save data',
    NETWORK_ERROR: 'Network connection error',
    VALIDATION_ERROR: 'Validation failed',
    UNKNOWN_ERROR: 'An unknown error occurred'
};

// ===== SUCCESS MESSAGES =====
export const SUCCESS_MESSAGES = {
    TASK_CREATED: 'Task created successfully!',
    TASK_UPDATED: 'Task updated successfully!',
    TASK_DELETED: 'Task deleted successfully!',
    TASK_COMPLETED: 'Task marked as completed!',
    BULK_OPERATION: 'Bulk operation completed successfully!',
    DATA_EXPORTED: 'Data exported successfully!',
    DATA_IMPORTED: 'Data imported successfully!',
    DATA_SAVED: 'Data saved successfully!',
    FILTERS_CLEARED: 'All filters cleared',
    SETTINGS_SAVED: 'Settings saved successfully!'
};

// ===== KEYBOARD SHORTCUTS =====
export const KEYBOARD_SHORTCUTS = {
    NEW_TASK: { key: 'n', ctrl: true, description: 'Create new task' },
    SAVE: { key: 's', ctrl: true, description: 'Save data' },
    SEARCH: { key: 'f', ctrl: true, description: 'Focus search' },
    SEARCH_ALT: { key: '/', description: 'Focus search (alternative)' },
    ESCAPE: { key: 'Escape', description: 'Close modals/cancel' },
    SELECT_ALL: { key: 'a', ctrl: true, description: 'Select all tasks' }
};

// ===== FEATURE FLAGS =====
export const FEATURES = {
    DRAG_AND_DROP: true,
    BULK_OPERATIONS: true,
    EXPORT_IMPORT: true,
    KEYBOARD_SHORTCUTS: true,
    AUTO_SAVE: true,
    NOTIFICATIONS: true,
    SEARCH: true,
    FILTERING: true,
    SORTING: true,
    STATISTICS: true,
    THEMES: false, // Future feature
    COLLABORATION: false, // Future feature
    CLOUD_SYNC: false // Future feature
};

// ===== API ENDPOINTS (for future cloud features) =====
export const API_ENDPOINTS = {
    BASE_URL: 'https://api.taskmaster.app',
    TASKS: '/api/tasks',
    USERS: '/api/users',
    SYNC: '/api/sync',
    EXPORT: '/api/export',
    IMPORT: '/api/import'
};

// ===== DEFAULT USER PREFERENCES =====
export const DEFAULT_PREFERENCES = {
    view: VIEW_MODES.CARD,
    tasksPerPage: APP_SETTINGS.DEFAULT_TASKS_PER_PAGE,
    sortBy: SORT_OPTIONS.CREATED_DESC,
    theme: 'light',
    notifications: true,
    autoSave: true,
    keyboardShortcuts: true,
    language: 'en'
};

// Export all constants as a single object for convenience
export const CONSTANTS = {
    TASK_TYPES,
    TASK_PRIORITIES,
    TASK_STATUSES,
    VIEW_MODES,
    SORT_OPTIONS,
    DATE_FILTERS,
    NOTIFICATION_TYPES,
    STORAGE_KEYS,
    APP_SETTINGS,
    UI_CONSTANTS,
    TASK_TYPE_CONFIG,
    PRIORITY_CONFIG,
    STATUS_CONFIG,
    VALIDATION_RULES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    KEYBOARD_SHORTCUTS,
    FEATURES,
    API_ENDPOINTS,
    DEFAULT_PREFERENCES
};

export default CONSTANTS;
