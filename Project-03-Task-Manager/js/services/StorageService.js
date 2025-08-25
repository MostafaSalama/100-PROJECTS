/**
 * StorageService.js - Storage Service Implementation
 * 
 * Handles data persistence using localStorage with backup and sync capabilities.
 * Provides abstraction layer for different storage mechanisms.
 */

export class StorageService {
    constructor(storageType = 'localStorage') {
        this.storageType = storageType;
        this.storageKey = 'taskmaster_tasks';
        this.backupKey = 'taskmaster_tasks_backup';
        this.metadataKey = 'taskmaster_metadata';
        this.maxBackups = 5;
        
        this.validateStorageSupport();
    }

    /**
     * Validate storage support
     * @throws {Error} If storage is not supported
     */
    validateStorageSupport() {
        try {
            if (!this.isStorageAvailable()) {
                throw new Error(`${this.storageType} is not available`);
            }
        } catch (error) {
            throw new Error(`Storage validation failed: ${error.message}`);
        }
    }

    /**
     * Check if storage is available
     * @returns {boolean} True if storage is available
     */
    isStorageAvailable() {
        try {
            const storage = this.getStorageObject();
            const testKey = '__storage_test__';
            storage.setItem(testKey, 'test');
            storage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get storage object based on type
     * @returns {Storage} Storage object
     */
    getStorageObject() {
        switch (this.storageType) {
            case 'localStorage':
                return localStorage;
            case 'sessionStorage':
                return sessionStorage;
            default:
                throw new Error(`Unsupported storage type: ${this.storageType}`);
        }
    }

    /**
     * Save tasks to storage
     * @param {Array} tasks - Array of task objects
     * @returns {Promise<void>}
     */
    async saveTasks(tasks) {
        try {
            // Create backup before saving new data
            await this.createBackup();
            
            const storage = this.getStorageObject();
            const data = {
                tasks: tasks,
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                checksum: this.calculateChecksum(tasks)
            };
            
            storage.setItem(this.storageKey, JSON.stringify(data));
            
            // Update metadata
            await this.updateMetadata();
            
            // Emit save event
            this.emit('tasksSaved', { count: tasks.length });
            
        } catch (error) {
            throw new Error(`Failed to save tasks: ${error.message}`);
        }
    }

    /**
     * Load tasks from storage
     * @returns {Promise<Array>} Array of task objects
     */
    async loadTasks() {
        try {
            const storage = this.getStorageObject();
            const dataStr = storage.getItem(this.storageKey);
            
            if (!dataStr) {
                // Try to load from backup
                return await this.loadFromBackup() || [];
            }
            
            const data = JSON.parse(dataStr);
            
            // Validate data integrity
            if (!this.validateData(data)) {
                console.warn('Data integrity check failed, attempting backup restore');
                return await this.loadFromBackup() || [];
            }
            
            // Emit load event
            this.emit('tasksLoaded', { count: data.tasks.length });
            
            return data.tasks || [];
            
        } catch (error) {
            console.error('Failed to load tasks from primary storage:', error);
            
            // Try backup
            try {
                const backupTasks = await this.loadFromBackup();
                if (backupTasks) {
                    console.log('Successfully loaded from backup');
                    return backupTasks;
                }
            } catch (backupError) {
                console.error('Failed to load from backup:', backupError);
            }
            
            throw new Error(`Failed to load tasks: ${error.message}`);
        }
    }

    /**
     * Create backup of current data
     * @returns {Promise<void>}
     */
    async createBackup() {
        try {
            const storage = this.getStorageObject();
            const currentData = storage.getItem(this.storageKey);
            
            if (!currentData) {
                return; // Nothing to backup
            }
            
            // Get existing backups
            const backups = this.getBackups();
            
            // Add new backup
            const backup = {
                data: currentData,
                timestamp: new Date().toISOString(),
                id: Date.now().toString()
            };
            
            backups.unshift(backup);
            
            // Keep only max number of backups
            if (backups.length > this.maxBackups) {
                backups.splice(this.maxBackups);
            }
            
            // Save backups
            storage.setItem(this.backupKey, JSON.stringify(backups));
            
        } catch (error) {
            console.error('Failed to create backup:', error);
        }
    }

    /**
     * Load tasks from backup
     * @param {number} backupIndex - Backup index (0 = latest)
     * @returns {Promise<Array|null>} Array of tasks or null
     */
    async loadFromBackup(backupIndex = 0) {
        try {
            const backups = this.getBackups();
            
            if (!backups || backups.length <= backupIndex) {
                return null;
            }
            
            const backup = backups[backupIndex];
            const data = JSON.parse(backup.data);
            
            if (this.validateData(data)) {
                this.emit('backupRestored', { 
                    backupId: backup.id, 
                    timestamp: backup.timestamp 
                });
                return data.tasks || [];
            }
            
            // Try next backup if current one is invalid
            if (backupIndex + 1 < backups.length) {
                return await this.loadFromBackup(backupIndex + 1);
            }
            
            return null;
            
        } catch (error) {
            console.error('Failed to load from backup:', error);
            return null;
        }
    }

    /**
     * Get all available backups
     * @returns {Array} Array of backup objects
     */
    getBackups() {
        try {
            const storage = this.getStorageObject();
            const backupsStr = storage.getItem(this.backupKey);
            return backupsStr ? JSON.parse(backupsStr) : [];
        } catch (error) {
            console.error('Failed to get backups:', error);
            return [];
        }
    }

    /**
     * Delete specific backup
     * @param {string} backupId - Backup ID to delete
     * @returns {Promise<boolean>} Success status
     */
    async deleteBackup(backupId) {
        try {
            const backups = this.getBackups();
            const filteredBackups = backups.filter(backup => backup.id !== backupId);
            
            if (filteredBackups.length !== backups.length) {
                const storage = this.getStorageObject();
                storage.setItem(this.backupKey, JSON.stringify(filteredBackups));
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to delete backup:', error);
            return false;
        }
    }

    /**
     * Validate data integrity
     * @param {Object} data - Data to validate
     * @returns {boolean} True if data is valid
     */
    validateData(data) {
        try {
            // Basic structure validation
            if (!data || typeof data !== 'object') {
                return false;
            }
            
            if (!Array.isArray(data.tasks)) {
                return false;
            }
            
            // Checksum validation
            if (data.checksum) {
                const calculatedChecksum = this.calculateChecksum(data.tasks);
                if (calculatedChecksum !== data.checksum) {
                    console.warn('Checksum mismatch detected');
                    return false;
                }
            }
            
            // Validate each task has required properties
            return data.tasks.every(task => 
                task && 
                typeof task === 'object' && 
                task.id && 
                task.title && 
                task.type
            );
            
        } catch (error) {
            console.error('Data validation error:', error);
            return false;
        }
    }

    /**
     * Calculate checksum for data integrity
     * @param {Array} tasks - Tasks array
     * @returns {string} Checksum
     */
    calculateChecksum(tasks) {
        try {
            const dataString = JSON.stringify(tasks);
            let hash = 0;
            
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32-bit integer
            }
            
            return Math.abs(hash).toString(36);
        } catch (error) {
            return '';
        }
    }

    /**
     * Update storage metadata
     * @returns {Promise<void>}
     */
    async updateMetadata() {
        try {
            const storage = this.getStorageObject();
            const metadata = {
                lastSaved: new Date().toISOString(),
                storageType: this.storageType,
                version: '1.0.0',
                backupCount: this.getBackups().length
            };
            
            storage.setItem(this.metadataKey, JSON.stringify(metadata));
        } catch (error) {
            console.error('Failed to update metadata:', error);
        }
    }

    /**
     * Get storage metadata
     * @returns {Object|null} Metadata object
     */
    getMetadata() {
        try {
            const storage = this.getStorageObject();
            const metadataStr = storage.getItem(this.metadataKey);
            return metadataStr ? JSON.parse(metadataStr) : null;
        } catch (error) {
            console.error('Failed to get metadata:', error);
            return null;
        }
    }

    /**
     * Get storage usage information
     * @returns {Object} Storage usage stats
     */
    getStorageUsage() {
        try {
            const storage = this.getStorageObject();
            let totalSize = 0;
            let itemCount = 0;
            
            // Calculate total storage used by our app
            const keys = [this.storageKey, this.backupKey, this.metadataKey];
            
            keys.forEach(key => {
                const item = storage.getItem(key);
                if (item) {
                    totalSize += item.length;
                    itemCount++;
                }
            });
            
            // Convert to KB
            const sizeInKB = (totalSize / 1024).toFixed(2);
            
            return {
                totalSize: totalSize,
                sizeInKB: sizeInKB,
                itemCount: itemCount,
                backupCount: this.getBackups().length,
                isNearLimit: this.storageType === 'localStorage' && totalSize > 4 * 1024 * 1024 // 4MB warning
            };
            
        } catch (error) {
            console.error('Failed to get storage usage:', error);
            return { totalSize: 0, sizeInKB: '0', itemCount: 0 };
        }
    }

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            const storage = this.getStorageObject();
            
            // Create one final backup before clearing
            await this.createBackup();
            
            storage.removeItem(this.storageKey);
            storage.removeItem(this.metadataKey);
            
            this.emit('storageCleared');
            
        } catch (error) {
            throw new Error(`Failed to clear storage: ${error.message}`);
        }
    }

    /**
     * Clear all data including backups
     * @returns {Promise<void>}
     */
    async clearAll() {
        try {
            const storage = this.getStorageObject();
            
            storage.removeItem(this.storageKey);
            storage.removeItem(this.backupKey);
            storage.removeItem(this.metadataKey);
            
            this.emit('storageCleared', { includeBackups: true });
            
        } catch (error) {
            throw new Error(`Failed to clear all storage: ${error.message}`);
        }
    }

    /**
     * Export data for backup or migration
     * @returns {Promise<string>} JSON string of all data
     */
    async exportData() {
        try {
            const tasks = await this.loadTasks();
            const metadata = this.getMetadata();
            const backups = this.getBackups();
            
            const exportData = {
                tasks: tasks,
                metadata: metadata,
                backups: backups,
                exportDate: new Date().toISOString(),
                version: '1.0.0'
            };
            
            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            throw new Error(`Failed to export data: ${error.message}`);
        }
    }

    /**
     * Import data from backup or migration
     * @param {string} jsonData - JSON data to import
     * @returns {Promise<Object>} Import results
     */
    async importData(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.tasks || !Array.isArray(importData.tasks)) {
                throw new Error('Invalid import data format');
            }
            
            // Backup current data first
            await this.createBackup();
            
            // Import tasks
            await this.saveTasks(importData.tasks);
            
            // Import backups if available
            if (importData.backups && Array.isArray(importData.backups)) {
                const storage = this.getStorageObject();
                storage.setItem(this.backupKey, JSON.stringify(importData.backups));
            }
            
            this.emit('dataImported', { 
                taskCount: importData.tasks.length,
                backupCount: importData.backups ? importData.backups.length : 0
            });
            
            return {
                success: true,
                taskCount: importData.tasks.length,
                backupCount: importData.backups ? importData.backups.length : 0
            };
            
        } catch (error) {
            throw new Error(`Failed to import data: ${error.message}`);
        }
    }

    /**
     * Sync data with external source (placeholder for future cloud sync)
     * @param {Object} syncOptions - Sync configuration
     * @returns {Promise<Object>} Sync results
     */
    async sync(syncOptions = {}) {
        // Placeholder for future cloud synchronization
        console.log('Sync functionality not yet implemented');
        return {
            success: false,
            message: 'Sync functionality will be available in future version'
        };
    }

    /**
     * Simple event emitter for storage events
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    emit(event, data = {}) {
        // Dispatch custom event for other parts of the app to listen
        const customEvent = new CustomEvent(`storage:${event}`, {
            detail: { ...data, timestamp: new Date().toISOString() }
        });
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(customEvent);
        }
    }

    /**
     * Get storage health status
     * @returns {Object} Health information
     */
    getHealth() {
        const usage = this.getStorageUsage();
        const metadata = this.getMetadata();
        const backups = this.getBackups();
        
        const health = {
            status: 'healthy',
            issues: [],
            recommendations: []
        };
        
        // Check storage usage
        if (usage.isNearLimit) {
            health.status = 'warning';
            health.issues.push('Storage usage is near the limit');
            health.recommendations.push('Consider cleaning up old backups');
        }
        
        // Check backup availability
        if (backups.length === 0) {
            health.issues.push('No backups available');
            health.recommendations.push('Backups are created automatically when saving data');
        }
        
        // Check last saved time
        if (metadata && metadata.lastSaved) {
            const lastSaved = new Date(metadata.lastSaved);
            const daysSinceLastSave = (Date.now() - lastSaved.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceLastSave > 7) {
                health.issues.push('Data has not been saved recently');
                health.recommendations.push('Consider creating manual backup');
            }
        }
        
        return {
            ...health,
            usage: usage,
            backupCount: backups.length,
            lastSaved: metadata?.lastSaved || null
        };
    }
}

export default StorageService;
