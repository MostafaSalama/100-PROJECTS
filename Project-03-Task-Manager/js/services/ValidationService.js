/**
 * ValidationService.js - Validation Service Implementation
 * 
 * Provides comprehensive validation for tasks, forms, and user input.
 * Implements validation rules and error handling.
 */

export class ValidationService {
    constructor() {
        this.validationRules = this.initializeValidationRules();
        this.customValidators = new Map();
    }

    /**
     * Initialize default validation rules
     * @returns {Object} Validation rules object
     */
    initializeValidationRules() {
        return {
            // Basic field validation rules
            title: {
                required: true,
                minLength: 1,
                maxLength: 200,
                pattern: null,
                sanitize: true
            },
            description: {
                required: false,
                maxLength: 1000,
                sanitize: true
            },
            type: {
                required: true,
                validValues: ['work', 'personal', 'project', 'reminder', 'meeting', 'goal']
            },
            priority: {
                required: true,
                validValues: ['low', 'medium', 'high']
            },
            status: {
                required: true,
                validValues: ['pending', 'in-progress', 'completed', 'cancelled']
            },
            progress: {
                required: false,
                type: 'number',
                min: 0,
                max: 100
            },
            estimatedMinutes: {
                required: false,
                type: 'number',
                min: 0,
                max: 10080 // 1 week in minutes
            },
            dueDate: {
                required: false,
                type: 'date',
                minDate: null, // No past date restriction by default
                maxDate: null
            },
            tags: {
                required: false,
                type: 'array',
                maxLength: 20, // Max 20 tags
                itemValidation: {
                    type: 'string',
                    maxLength: 30,
                    pattern: /^[a-zA-Z0-9-_\s]+$/
                }
            }
        };
    }

    /**
     * Validate task object
     * @param {Object} task - Task object to validate
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    validateTask(task, options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            sanitizedData: {}
        };

        if (!task || typeof task !== 'object') {
            result.valid = false;
            result.errors.push('Task must be an object');
            return result;
        }

        // Validate each field
        Object.keys(this.validationRules).forEach(field => {
            const fieldResult = this.validateField(field, task[field], this.validationRules[field], options);
            
            if (!fieldResult.valid) {
                result.valid = false;
                result.errors.push(...fieldResult.errors.map(error => `${field}: ${error}`));
            }
            
            if (fieldResult.warnings.length > 0) {
                result.warnings.push(...fieldResult.warnings.map(warning => `${field}: ${warning}`));
            }
            
            // Add sanitized data
            if (fieldResult.sanitizedValue !== undefined) {
                result.sanitizedData[field] = fieldResult.sanitizedValue;
            } else if (task[field] !== undefined) {
                result.sanitizedData[field] = task[field];
            }
        });

        // Cross-field validation
        const crossValidation = this.validateCrossFields(result.sanitizedData, options);
        if (!crossValidation.valid) {
            result.valid = false;
            result.errors.push(...crossValidation.errors);
        }
        result.warnings.push(...crossValidation.warnings);

        // Type-specific validation
        if (result.sanitizedData.type) {
            const typeValidation = this.validateTaskType(result.sanitizedData, result.sanitizedData.type, options);
            if (!typeValidation.valid) {
                result.valid = false;
                result.errors.push(...typeValidation.errors);
            }
            result.warnings.push(...typeValidation.warnings);
        }

        return result;
    }

    /**
     * Validate individual field
     * @param {string} fieldName - Name of the field
     * @param {*} value - Field value
     * @param {Object} rules - Validation rules
     * @param {Object} options - Validation options
     * @returns {Object} Field validation result
     */
    validateField(fieldName, value, rules, options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            sanitizedValue: undefined
        };

        // Check required
        if (rules.required && this.isEmpty(value)) {
            result.valid = false;
            result.errors.push('is required');
            return result;
        }

        // If value is empty and not required, skip further validation
        if (this.isEmpty(value) && !rules.required) {
            return result;
        }

        // Type validation
        if (rules.type && !this.validateType(value, rules.type)) {
            result.valid = false;
            result.errors.push(`must be of type ${rules.type}`);
            return result;
        }

        // String validations
        if (typeof value === 'string') {
            // Sanitize if requested
            if (rules.sanitize) {
                result.sanitizedValue = this.sanitizeString(value);
                value = result.sanitizedValue;
            }

            // Min length
            if (rules.minLength !== undefined && value.length < rules.minLength) {
                result.valid = false;
                result.errors.push(`must be at least ${rules.minLength} characters long`);
            }

            // Max length
            if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                result.valid = false;
                result.errors.push(`cannot exceed ${rules.maxLength} characters`);
            }

            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                result.valid = false;
                result.errors.push('contains invalid characters');
            }
        }

        // Number validations
        if (rules.type === 'number') {
            const numValue = Number(value);
            
            if (isNaN(numValue)) {
                result.valid = false;
                result.errors.push('must be a valid number');
            } else {
                // Min value
                if (rules.min !== undefined && numValue < rules.min) {
                    result.valid = false;
                    result.errors.push(`cannot be less than ${rules.min}`);
                }

                // Max value
                if (rules.max !== undefined && numValue > rules.max) {
                    result.valid = false;
                    result.errors.push(`cannot exceed ${rules.max}`);
                }

                result.sanitizedValue = numValue;
            }
        }

        // Date validations
        if (rules.type === 'date') {
            const dateValue = new Date(value);
            
            if (isNaN(dateValue.getTime())) {
                result.valid = false;
                result.errors.push('must be a valid date');
            } else {
                // Min date
                if (rules.minDate && dateValue < new Date(rules.minDate)) {
                    result.valid = false;
                    result.errors.push(`cannot be before ${rules.minDate}`);
                }

                // Max date
                if (rules.maxDate && dateValue > new Date(rules.maxDate)) {
                    result.valid = false;
                    result.errors.push(`cannot be after ${rules.maxDate}`);
                }

                // Warning for past dates (if not explicitly allowed)
                if (rules.minDate === null && dateValue < new Date() && !options.allowPastDates) {
                    result.warnings.push('is in the past');
                }

                result.sanitizedValue = dateValue.toISOString();
            }
        }

        // Array validations
        if (rules.type === 'array') {
            if (!Array.isArray(value)) {
                result.valid = false;
                result.errors.push('must be an array');
            } else {
                // Max length
                if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                    result.valid = false;
                    result.errors.push(`cannot have more than ${rules.maxLength} items`);
                }

                // Validate each item if itemValidation is specified
                if (rules.itemValidation) {
                    const sanitizedArray = [];
                    let hasItemErrors = false;

                    value.forEach((item, index) => {
                        const itemResult = this.validateField(`${fieldName}[${index}]`, item, rules.itemValidation, options);
                        
                        if (!itemResult.valid) {
                            result.valid = false;
                            hasItemErrors = true;
                            result.errors.push(`item at index ${index}: ${itemResult.errors.join(', ')}`);
                        }
                        
                        sanitizedArray.push(itemResult.sanitizedValue !== undefined ? itemResult.sanitizedValue : item);
                    });

                    if (!hasItemErrors) {
                        result.sanitizedValue = sanitizedArray;
                    }
                }
            }
        }

        // Valid values check
        if (rules.validValues && !rules.validValues.includes(value)) {
            result.valid = false;
            result.errors.push(`must be one of: ${rules.validValues.join(', ')}`);
        }

        return result;
    }

    /**
     * Cross-field validation
     * @param {Object} data - Task data
     * @param {Object} options - Validation options
     * @returns {Object} Cross-field validation result
     */
    validateCrossFields(data, options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        // Status and progress consistency
        if (data.status === 'completed' && data.progress < 100) {
            result.warnings.push('Task marked as completed but progress is less than 100%');
        }

        if (data.status === 'pending' && data.progress > 0) {
            result.warnings.push('Task marked as pending but has progress');
        }

        // Due date and status
        if (data.dueDate && data.status !== 'completed') {
            const dueDate = new Date(data.dueDate);
            const now = new Date();
            
            if (dueDate < now) {
                result.warnings.push('Task is overdue');
            }
        }

        // Estimated vs actual time
        if (data.estimatedMinutes && data.actualMinutes && data.actualMinutes > data.estimatedMinutes * 2) {
            result.warnings.push('Actual time significantly exceeds estimated time');
        }

        return result;
    }

    /**
     * Type-specific validation
     * @param {Object} data - Task data
     * @param {string} type - Task type
     * @param {Object} options - Validation options
     * @returns {Object} Type validation result
     */
    validateTaskType(data, type, options = {}) {
        const result = {
            valid: true,
            errors: [],
            warnings: []
        };

        switch (type) {
            case 'work':
                // Work-specific validations
                if (data.billableHours && data.billableHours < 0) {
                    result.valid = false;
                    result.errors.push('Billable hours cannot be negative');
                }
                
                if (data.hourlyRate && data.hourlyRate < 0) {
                    result.valid = false;
                    result.errors.push('Hourly rate cannot be negative');
                }
                
                if (data.meetingRequired && !data.dueDate) {
                    result.warnings.push('Meeting tasks should have a due date/time');
                }
                break;

            case 'personal':
                // Personal-specific validations
                if (data.motivationLevel && (data.motivationLevel < 1 || data.motivationLevel > 10)) {
                    result.valid = false;
                    result.errors.push('Motivation level must be between 1 and 10');
                }
                
                if (data.energyLevel && !['low', 'medium', 'high'].includes(data.energyLevel)) {
                    result.valid = false;
                    result.errors.push('Energy level must be low, medium, or high');
                }
                break;

            case 'project':
                // Project-specific validations
                if (data.storyPoints && data.storyPoints < 0) {
                    result.valid = false;
                    result.errors.push('Story points cannot be negative');
                }
                
                if (data.budget && data.budget < 0) {
                    result.valid = false;
                    result.errors.push('Budget cannot be negative');
                }
                
                if (data.dependencies && data.dependencies.includes(data.id)) {
                    result.valid = false;
                    result.errors.push('Task cannot depend on itself');
                }
                break;
        }

        return result;
    }

    /**
     * Validate form data
     * @param {FormData|Object} formData - Form data to validate
     * @param {string} formType - Type of form
     * @returns {Object} Form validation result
     */
    validateForm(formData, formType = 'task') {
        const data = formData instanceof FormData ? this.formDataToObject(formData) : formData;
        
        switch (formType) {
            case 'task':
                return this.validateTask(data);
            default:
                return { valid: false, errors: ['Unknown form type'], warnings: [] };
        }
    }

    /**
     * Convert FormData to plain object
     * @param {FormData} formData - FormData object
     * @returns {Object} Plain object
     */
    formDataToObject(formData) {
        const obj = {};
        
        for (let [key, value] of formData.entries()) {
            // Handle multiple values for same key (like checkboxes)
            if (obj[key]) {
                if (Array.isArray(obj[key])) {
                    obj[key].push(value);
                } else {
                    obj[key] = [obj[key], value];
                }
            } else {
                obj[key] = value;
            }
        }
        
        // Parse special fields
        if (obj.tags && typeof obj.tags === 'string') {
            obj.tags = obj.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
        
        if (obj.progress) {
            obj.progress = Number(obj.progress);
        }
        
        if (obj.estimatedMinutes) {
            obj.estimatedMinutes = Number(obj.estimatedMinutes);
        }
        
        return obj;
    }

    /**
     * Register custom validator
     * @param {string} name - Validator name
     * @param {Function} validator - Validator function
     */
    registerValidator(name, validator) {
        if (typeof validator !== 'function') {
            throw new Error('Validator must be a function');
        }
        
        this.customValidators.set(name, validator);
    }

    /**
     * Run custom validator
     * @param {string} name - Validator name
     * @param {*} value - Value to validate
     * @param {Object} options - Validator options
     * @returns {Object} Validation result
     */
    runCustomValidator(name, value, options = {}) {
        const validator = this.customValidators.get(name);
        
        if (!validator) {
            return { valid: false, errors: [`Unknown validator: ${name}`], warnings: [] };
        }
        
        try {
            return validator(value, options);
        } catch (error) {
            return { valid: false, errors: [`Validator error: ${error.message}`], warnings: [] };
        }
    }

    /**
     * Check if value is empty
     * @param {*} value - Value to check
     * @returns {boolean} True if empty
     */
    isEmpty(value) {
        return value === null || 
               value === undefined || 
               value === '' || 
               (Array.isArray(value) && value.length === 0);
    }

    /**
     * Validate type
     * @param {*} value - Value to check
     * @param {string} expectedType - Expected type
     * @returns {boolean} True if type matches
     */
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return !isNaN(Number(value));
            case 'boolean':
                return typeof value === 'boolean';
            case 'date':
                return !isNaN(new Date(value).getTime());
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null;
            default:
                return true;
        }
    }

    /**
     * Sanitize string input
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitizeString(str) {
        if (typeof str !== 'string') {
            return str;
        }
        
        return str
            .trim() // Remove leading/trailing whitespace
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/[<>]/g, '') // Remove potential HTML brackets
            .substring(0, 1000); // Limit length
    }

    /**
     * Get validation summary
     * @param {Object} validationResult - Validation result
     * @returns {string} Human-readable summary
     */
    getValidationSummary(validationResult) {
        const { valid, errors, warnings } = validationResult;
        
        if (valid && errors.length === 0 && warnings.length === 0) {
            return 'All validations passed successfully.';
        }
        
        let summary = [];
        
        if (errors.length > 0) {
            summary.push(`${errors.length} error(s): ${errors.join('; ')}`);
        }
        
        if (warnings.length > 0) {
            summary.push(`${warnings.length} warning(s): ${warnings.join('; ')}`);
        }
        
        return summary.join(' | ');
    }

    /**
     * Add validation rule
     * @param {string} field - Field name
     * @param {Object} rule - Validation rule
     */
    addValidationRule(field, rule) {
        this.validationRules[field] = { ...this.validationRules[field], ...rule };
    }

    /**
     * Remove validation rule
     * @param {string} field - Field name
     */
    removeValidationRule(field) {
        delete this.validationRules[field];
    }

    /**
     * Get all validation rules
     * @returns {Object} All validation rules
     */
    getValidationRules() {
        return { ...this.validationRules };
    }
}

export default ValidationService;
