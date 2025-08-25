/**
 * validators.js - Additional Validation Utilities
 * 
 * Extended validation functions and custom validators.
 * Complements ValidationService with specific validation logic.
 */

import { CONSTANTS } from './constants.js';

// ===== BASIC VALIDATORS =====

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
export function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate date format and range
 * @param {string|Date} date - Date to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export function validateDate(date, options = {}) {
    const result = { valid: true, errors: [] };
    
    let dateObj;
    try {
        dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date');
        }
    } catch (error) {
        result.valid = false;
        result.errors.push('Invalid date format');
        return result;
    }
    
    // Check if date is in the past (if not allowed)
    if (options.allowPastDates === false && dateObj < new Date()) {
        result.valid = false;
        result.errors.push('Date cannot be in the past');
    }
    
    // Check minimum date
    if (options.minDate && dateObj < new Date(options.minDate)) {
        result.valid = false;
        result.errors.push(`Date cannot be before ${options.minDate}`);
    }
    
    // Check maximum date
    if (options.maxDate && dateObj > new Date(options.maxDate)) {
        result.valid = false;
        result.errors.push(`Date cannot be after ${options.maxDate}`);
    }
    
    return result;
}

/**
 * Validate task title
 * @param {string} title - Title to validate
 * @returns {Object} Validation result
 */
export function validateTitle(title) {
    const result = { valid: true, errors: [] };
    
    if (!title || typeof title !== 'string') {
        result.valid = false;
        result.errors.push('Title is required');
        return result;
    }
    
    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length === 0) {
        result.valid = false;
        result.errors.push('Title cannot be empty');
    }
    
    if (trimmedTitle.length > CONSTANTS.APP_SETTINGS.MAX_TITLE_LENGTH) {
        result.valid = false;
        result.errors.push(`Title cannot exceed ${CONSTANTS.APP_SETTINGS.MAX_TITLE_LENGTH} characters`);
    }
    
    return result;
}

/**
 * Validate task tags
 * @param {Array} tags - Tags array to validate
 * @returns {Object} Validation result
 */
export function validateTags(tags) {
    const result = { valid: true, errors: [], sanitizedTags: [] };
    
    if (!tags) {
        return result;
    }
    
    if (!Array.isArray(tags)) {
        result.valid = false;
        result.errors.push('Tags must be an array');
        return result;
    }
    
    if (tags.length > CONSTANTS.APP_SETTINGS.MAX_TAGS) {
        result.valid = false;
        result.errors.push(`Cannot have more than ${CONSTANTS.APP_SETTINGS.MAX_TAGS} tags`);
    }
    
    const sanitizedTags = [];
    const seenTags = new Set();
    
    for (const tag of tags) {
        if (typeof tag !== 'string') {
            result.errors.push('All tags must be strings');
            result.valid = false;
            continue;
        }
        
        const cleanTag = tag.trim().toLowerCase();
        
        if (cleanTag.length === 0) {
            continue; // Skip empty tags
        }
        
        if (cleanTag.length > CONSTANTS.APP_SETTINGS.MAX_TAG_LENGTH) {
            result.errors.push(`Tag "${cleanTag}" is too long (max ${CONSTANTS.APP_SETTINGS.MAX_TAG_LENGTH} characters)`);
            result.valid = false;
            continue;
        }
        
        // Check for valid characters
        if (!/^[a-zA-Z0-9-_\s]+$/.test(cleanTag)) {
            result.errors.push(`Tag "${cleanTag}" contains invalid characters`);
            result.valid = false;
            continue;
        }
        
        // Avoid duplicates
        if (!seenTags.has(cleanTag)) {
            seenTags.add(cleanTag);
            sanitizedTags.push(cleanTag);
        }
    }
    
    result.sanitizedTags = sanitizedTags;
    return result;
}

/**
 * Validate progress value
 * @param {number} progress - Progress value to validate
 * @returns {Object} Validation result
 */
export function validateProgress(progress) {
    const result = { valid: true, errors: [] };
    
    if (progress === undefined || progress === null || progress === '') {
        return result; // Optional field
    }
    
    const numProgress = Number(progress);
    
    if (isNaN(numProgress)) {
        result.valid = false;
        result.errors.push('Progress must be a number');
        return result;
    }
    
    if (numProgress < 0 || numProgress > 100) {
        result.valid = false;
        result.errors.push('Progress must be between 0 and 100');
    }
    
    return result;
}

/**
 * Validate time estimate
 * @param {number} minutes - Time in minutes to validate
 * @returns {Object} Validation result
 */
export function validateTimeEstimate(minutes) {
    const result = { valid: true, errors: [] };
    
    if (minutes === undefined || minutes === null || minutes === '') {
        return result; // Optional field
    }
    
    const numMinutes = Number(minutes);
    
    if (isNaN(numMinutes)) {
        result.valid = false;
        result.errors.push('Time estimate must be a number');
        return result;
    }
    
    if (numMinutes < 0) {
        result.valid = false;
        result.errors.push('Time estimate cannot be negative');
    }
    
    if (numMinutes > CONSTANTS.APP_SETTINGS.MAX_ESTIMATED_MINUTES) {
        result.valid = false;
        result.errors.push(`Time estimate cannot exceed ${CONSTANTS.APP_SETTINGS.MAX_ESTIMATED_MINUTES} minutes`);
    }
    
    return result;
}

// ===== TASK TYPE SPECIFIC VALIDATORS =====

/**
 * Validate work task specific fields
 * @param {Object} data - Work task data
 * @returns {Object} Validation result
 */
export function validateWorkTask(data) {
    const result = { valid: true, errors: [] };
    
    // Validate billable hours
    if (data.billableHours !== undefined && data.billableHours !== null) {
        const hours = Number(data.billableHours);
        if (isNaN(hours) || hours < 0) {
            result.valid = false;
            result.errors.push('Billable hours must be a positive number');
        }
    }
    
    // Validate hourly rate
    if (data.hourlyRate !== undefined && data.hourlyRate !== null) {
        const rate = Number(data.hourlyRate);
        if (isNaN(rate) || rate < 0) {
            result.valid = false;
            result.errors.push('Hourly rate must be a positive number');
        }
    }
    
    return result;
}

/**
 * Validate personal task specific fields
 * @param {Object} data - Personal task data
 * @returns {Object} Validation result
 */
export function validatePersonalTask(data) {
    const result = { valid: true, errors: [] };
    
    // Validate motivation level
    if (data.motivationLevel !== undefined && data.motivationLevel !== null) {
        const level = Number(data.motivationLevel);
        if (isNaN(level) || level < 1 || level > 10) {
            result.valid = false;
            result.errors.push('Motivation level must be between 1 and 10');
        }
    }
    
    // Validate energy level
    if (data.energyLevel && !['low', 'medium', 'high'].includes(data.energyLevel)) {
        result.valid = false;
        result.errors.push('Energy level must be low, medium, or high');
    }
    
    return result;
}

/**
 * Validate project task specific fields
 * @param {Object} data - Project task data
 * @returns {Object} Validation result
 */
export function validateProjectTask(data) {
    const result = { valid: true, errors: [] };
    
    // Validate story points
    if (data.storyPoints !== undefined && data.storyPoints !== null) {
        const points = Number(data.storyPoints);
        if (isNaN(points) || points < 0) {
            result.valid = false;
            result.errors.push('Story points must be a positive number');
        }
    }
    
    // Validate dependencies (no circular dependencies)
    if (data.dependencies && Array.isArray(data.dependencies)) {
        if (data.id && data.dependencies.includes(data.id)) {
            result.valid = false;
            result.errors.push('Task cannot depend on itself');
        }
    }
    
    return result;
}

// ===== COMPOSITE VALIDATORS =====

/**
 * Validate complete task object
 * @param {Object} taskData - Complete task data
 * @returns {Object} Validation result
 */
export function validateCompleteTask(taskData) {
    const result = { 
        valid: true, 
        errors: [],
        warnings: []
    };
    
    // Basic field validations
    const titleValidation = validateTitle(taskData.title);
    if (!titleValidation.valid) {
        result.valid = false;
        result.errors.push(...titleValidation.errors);
    }
    
    const tagsValidation = validateTags(taskData.tags);
    if (!tagsValidation.valid) {
        result.valid = false;
        result.errors.push(...tagsValidation.errors);
    }
    
    const progressValidation = validateProgress(taskData.progress);
    if (!progressValidation.valid) {
        result.valid = false;
        result.errors.push(...progressValidation.errors);
    }
    
    const timeValidation = validateTimeEstimate(taskData.estimatedMinutes);
    if (!timeValidation.valid) {
        result.valid = false;
        result.errors.push(...timeValidation.errors);
    }
    
    // Type-specific validations
    switch (taskData.type) {
        case 'work':
            const workValidation = validateWorkTask(taskData);
            if (!workValidation.valid) {
                result.valid = false;
                result.errors.push(...workValidation.errors);
            }
            break;
            
        case 'personal':
            const personalValidation = validatePersonalTask(taskData);
            if (!personalValidation.valid) {
                result.valid = false;
                result.errors.push(...personalValidation.errors);
            }
            break;
            
        case 'project':
            const projectValidation = validateProjectTask(taskData);
            if (!projectValidation.valid) {
                result.valid = false;
                result.errors.push(...projectValidation.errors);
            }
            break;
    }
    
    // Cross-field validations
    if (taskData.dueDate) {
        const dateValidation = validateDate(taskData.dueDate);
        if (!dateValidation.valid) {
            result.valid = false;
            result.errors.push(...dateValidation.errors);
        } else {
            // Warning for past due dates
            const dueDate = new Date(taskData.dueDate);
            if (dueDate < new Date()) {
                result.warnings.push('Due date is in the past');
            }
        }
    }
    
    // Status and progress consistency
    if (taskData.status === 'completed' && taskData.progress < 100) {
        result.warnings.push('Task marked as completed but progress is less than 100%');
    }
    
    if (taskData.status === 'pending' && taskData.progress > 0) {
        result.warnings.push('Task marked as pending but has progress');
    }
    
    return result;
}

// ===== SANITIZATION FUNCTIONS =====

/**
 * Sanitize string input for safe display
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') {
        return '';
    }
    
    return str
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/[<>]/g, ''); // Remove potential HTML brackets
}

/**
 * Sanitize HTML content
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML
 */
export function sanitizeHtml(html) {
    if (typeof html !== 'string') {
        return '';
    }
    
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

// Export all validators
export const validators = {
    isValidEmail,
    isValidUrl,
    validateDate,
    validateTitle,
    validateTags,
    validateProgress,
    validateTimeEstimate,
    validateWorkTask,
    validatePersonalTask,
    validateProjectTask,
    validateCompleteTask,
    sanitizeString,
    sanitizeHtml
};

export default validators;
