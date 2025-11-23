/**
 * StorageService.js - Local Data Storage Management
 * 
 * Handles localStorage, IndexedDB, and data synchronization for offline support
 */

import { APP_INFO, STORAGE, DEFAULTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

export class StorageService {
    constructor() {
        this.storage = localStorage;
        this.dbName = `${APP_INFO.NAME}_DB`;
        this.dbVersion = 1;
        this.db = null;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.autoSaveTimer = null;
        
        this.initializeDatabase();
        this.setupEventListeners();
        this.startAutoSave();
    }

    /**
     * Initialize IndexedDB for offline storage
     */
    async initializeDatabase() {
        try {
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, using localStorage only');
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB initialization failed:', request.error);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('todos')) {
                    const todosStore = db.createObjectStore('todos', { keyPath: 'id' });
                    todosStore.createIndex('status', 'status', { unique: false });
                    todosStore.createIndex('priority', 'priority', { unique: false });
                    todosStore.createIndex('folder', 'folder', { unique: false });
                    todosStore.createIndex('createdAt', 'createdAt', { unique: false });
                    todosStore.createIndex('dueDate', 'dueDate', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('folders')) {
                    db.createObjectStore('folders', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('syncQueue')) {
                    const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized successfully');
                
                // Handle database errors
                this.db.onerror = (event) => {
                    console.error('Database error:', event.target.error);
                };
                
                // Migrate data from localStorage if needed
                this.migrateFromLocalStorage();
            };
            
        } catch (error) {
            console.error('Failed to initialize IndexedDB:', error);
        }
    }

    /**
     * Setup event listeners for online/offline status
     */
    setupEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
            this.dispatchEvent('online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.dispatchEvent('offline');
        });
        
        // Handle page unload
        window.addEventListener('beforeunload', () => {
            this.stopAutoSave();
            this.saveAllData();
        });
    }

    /**
     * Start auto-save timer
     */
    startAutoSave() {
        this.autoSaveTimer = setInterval(() => {
            this.saveAllData();
        }, STORAGE.AUTO_SAVE_INTERVAL);
    }

    /**
     * Stop auto-save timer
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // ===== TODOS MANAGEMENT =====

    /**
     * Get all todos
     * @returns {Promise<Array>} Array of todos
     */
    async getAllTodos() {
        try {
            if (this.db) {
                return await this.getFromIndexedDB('todos');
            } else {
                const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
                return data.todos || [];
            }
        } catch (error) {
            console.error('Failed to get todos:', error);
            return [];
        }
    }

    /**
     * Save todo
     * @param {Object} todo - Todo object
     * @returns {Promise<Object>} Saved todo
     */
    async saveTodo(todo) {
        try {
            // Add timestamps
            const now = new Date().toISOString();
            if (!todo.createdAt) todo.createdAt = now;
            todo.updatedAt = now;
            
            // Validate todo
            this.validateTodo(todo);
            
            if (this.db) {
                await this.saveToIndexedDB('todos', todo);
            } else {
                await this.saveTodoToLocalStorage(todo);
            }
            
            // Add to sync queue if offline
            if (!this.isOnline) {
                await this.addToSyncQueue('saveTodo', todo);
            }
            
            this.dispatchEvent('todoSaved', { todo });
            return todo;
            
        } catch (error) {
            console.error('Failed to save todo:', error);
            throw new Error(ERROR_MESSAGES.STORAGE.SAVE_FAILED);
        }
    }

    /**
     * Delete todo
     * @param {string} todoId - Todo ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteTodo(todoId) {
        try {
            if (this.db) {
                await this.deleteFromIndexedDB('todos', todoId);
            } else {
                await this.deleteTodoFromLocalStorage(todoId);
            }
            
            // Add to sync queue if offline
            if (!this.isOnline) {
                await this.addToSyncQueue('deleteTodo', { id: todoId });
            }
            
            this.dispatchEvent('todoDeleted', { todoId });
            return true;
            
        } catch (error) {
            console.error('Failed to delete todo:', error);
            throw new Error(ERROR_MESSAGES.STORAGE.SAVE_FAILED);
        }
    }

    /**
     * Get todo by ID
     * @param {string} todoId - Todo ID
     * @returns {Promise<Object|null>} Todo object or null
     */
    async getTodoById(todoId) {
        try {
            if (this.db) {
                return await this.getFromIndexedDB('todos', todoId);
            } else {
                const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
                return data.todos?.find(todo => todo.id === todoId) || null;
            }
        } catch (error) {
            console.error('Failed to get todo by ID:', error);
            return null;
        }
    }

    // ===== FOLDERS MANAGEMENT =====

    /**
     * Get all folders
     * @returns {Promise<Array>} Array of folders
     */
    async getAllFolders() {
        try {
            if (this.db) {
                return await this.getFromIndexedDB('folders');
            } else {
                const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
                return data.folders || [];
            }
        } catch (error) {
            console.error('Failed to get folders:', error);
            return [];
        }
    }

    /**
     * Save folder
     * @param {Object} folder - Folder object
     * @returns {Promise<Object>} Saved folder
     */
    async saveFolder(folder) {
        try {
            // Add timestamps
            const now = new Date().toISOString();
            if (!folder.createdAt) folder.createdAt = now;
            folder.updatedAt = now;
            
            // Validate folder
            this.validateFolder(folder);
            
            if (this.db) {
                await this.saveToIndexedDB('folders', folder);
            } else {
                await this.saveFolderToLocalStorage(folder);
            }
            
            // Add to sync queue if offline
            if (!this.isOnline) {
                await this.addToSyncQueue('saveFolder', folder);
            }
            
            this.dispatchEvent('folderSaved', { folder });
            return folder;
            
        } catch (error) {
            console.error('Failed to save folder:', error);
            throw new Error(ERROR_MESSAGES.STORAGE.SAVE_FAILED);
        }
    }

    /**
     * Delete folder
     * @param {string} folderId - Folder ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteFolder(folderId) {
        try {
            if (this.db) {
                await this.deleteFromIndexedDB('folders', folderId);
            } else {
                await this.deleteFolderFromLocalStorage(folderId);
            }
            
            // Add to sync queue if offline
            if (!this.isOnline) {
                await this.addToSyncQueue('deleteFolder', { id: folderId });
            }
            
            this.dispatchEvent('folderDeleted', { folderId });
            return true;
            
        } catch (error) {
            console.error('Failed to delete folder:', error);
            throw new Error(ERROR_MESSAGES.STORAGE.SAVE_FAILED);
        }
    }

    // ===== SETTINGS MANAGEMENT =====

    /**
     * Get app settings
     * @returns {Promise<Object>} Settings object
     */
    async getSettings() {
        try {
            if (this.db) {
                const settings = await this.getFromIndexedDB('settings', 'app_settings');
                return settings?.value || DEFAULTS.SETTINGS;
            } else {
                const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
                return { ...DEFAULTS.SETTINGS, ...(data.settings || {}) };
            }
        } catch (error) {
            console.error('Failed to get settings:', error);
            return DEFAULTS.SETTINGS;
        }
    }

    /**
     * Save settings
     * @param {Object} settings - Settings object
     * @returns {Promise<Object>} Saved settings
     */
    async saveSettings(settings) {
        try {
            const settingsData = {
                key: 'app_settings',
                value: { ...DEFAULTS.SETTINGS, ...settings },
                updatedAt: new Date().toISOString()
            };
            
            if (this.db) {
                await this.saveToIndexedDB('settings', settingsData);
            } else {
                const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
                data.settings = settingsData.value;
                this.saveToLocalStorage(APP_INFO.STORAGE_KEY, data);
            }
            
            this.dispatchEvent('settingsSaved', { settings: settingsData.value });
            return settingsData.value;
            
        } catch (error) {
            console.error('Failed to save settings:', error);
            throw new Error(ERROR_MESSAGES.STORAGE.SAVE_FAILED);
        }
    }

    // ===== INDEXEDDB OPERATIONS =====

    /**
     * Get data from IndexedDB
     * @param {string} storeName - Store name
     * @param {string} key - Key (optional, gets all if not provided)
     * @returns {Promise<Array|Object>} Data
     */
    async getFromIndexedDB(storeName, key = null) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (key) {
                request = store.get(key);
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save data to IndexedDB
     * @param {string} storeName - Store name
     * @param {Object} data - Data to save
     * @returns {Promise<void>}
     */
    async saveToIndexedDB(storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete data from IndexedDB
     * @param {string} storeName - Store name
     * @param {string} key - Key to delete
     * @returns {Promise<void>}
     */
    async deleteFromIndexedDB(storeName, key) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ===== LOCALSTORAGE OPERATIONS =====

    /**
     * Get data from localStorage
     * @param {string} key - Storage key
     * @returns {Object} Parsed data
     */
    getFromLocalStorage(key) {
        try {
            const data = this.storage.getItem(key);
            return data ? JSON.parse(data) : { todos: [], folders: [], settings: {} };
        } catch (error) {
            console.error('Failed to parse localStorage data:', error);
            return { todos: [], folders: [], settings: {} };
        }
    }

    /**
     * Save data to localStorage
     * @param {string} key - Storage key
     * @param {Object} data - Data to save
     */
    saveToLocalStorage(key, data) {
        try {
            this.storage.setItem(key, JSON.stringify(data));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded');
                this.cleanupOldData();
            }
            throw error;
        }
    }

    /**
     * Save todo to localStorage
     * @param {Object} todo - Todo object
     */
    async saveTodoToLocalStorage(todo) {
        const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
        const existingIndex = data.todos.findIndex(t => t.id === todo.id);
        
        if (existingIndex >= 0) {
            data.todos[existingIndex] = todo;
        } else {
            data.todos.push(todo);
        }
        
        this.saveToLocalStorage(APP_INFO.STORAGE_KEY, data);
    }

    /**
     * Delete todo from localStorage
     * @param {string} todoId - Todo ID
     */
    async deleteTodoFromLocalStorage(todoId) {
        const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
        data.todos = data.todos.filter(todo => todo.id !== todoId);
        this.saveToLocalStorage(APP_INFO.STORAGE_KEY, data);
    }

    /**
     * Save folder to localStorage
     * @param {Object} folder - Folder object
     */
    async saveFolderToLocalStorage(folder) {
        const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
        const existingIndex = data.folders.findIndex(f => f.id === folder.id);
        
        if (existingIndex >= 0) {
            data.folders[existingIndex] = folder;
        } else {
            data.folders.push(folder);
        }
        
        this.saveToLocalStorage(APP_INFO.STORAGE_KEY, data);
    }

    /**
     * Delete folder from localStorage
     * @param {string} folderId - Folder ID
     */
    async deleteFolderFromLocalStorage(folderId) {
        const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
        data.folders = data.folders.filter(folder => folder.id !== folderId);
        this.saveToLocalStorage(APP_INFO.STORAGE_KEY, data);
    }

    // ===== SYNC QUEUE MANAGEMENT =====

    /**
     * Add action to sync queue
     * @param {string} action - Action type
     * @param {Object} data - Action data
     */
    async addToSyncQueue(action, data) {
        const syncItem = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2)}`,
            action,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.syncQueue.push(syncItem);
        
        if (this.db) {
            await this.saveToIndexedDB('syncQueue', syncItem);
        }
    }

    /**
     * Process sync queue when back online
     */
    async processSyncQueue() {
        try {
            if (this.db) {
                this.syncQueue = await this.getFromIndexedDB('syncQueue');
            }
            
            for (const item of this.syncQueue) {
                try {
                    await this.processSyncItem(item);
                    await this.removeFromSyncQueue(item.id);
                } catch (error) {
                    console.error('Failed to process sync item:', item, error);
                }
            }
            
            this.syncQueue = [];
            this.dispatchEvent('syncComplete');
            
        } catch (error) {
            console.error('Failed to process sync queue:', error);
        }
    }

    /**
     * Process individual sync item
     * @param {Object} item - Sync item
     */
    async processSyncItem(item) {
        switch (item.action) {
            case 'saveTodo':
                await this.saveTodo(item.data);
                break;
            case 'deleteTodo':
                await this.deleteTodo(item.data.id);
                break;
            case 'saveFolder':
                await this.saveFolder(item.data);
                break;
            case 'deleteFolder':
                await this.deleteFolder(item.data.id);
                break;
            default:
                console.warn('Unknown sync action:', item.action);
        }
    }

    /**
     * Remove item from sync queue
     * @param {string} itemId - Item ID
     */
    async removeFromSyncQueue(itemId) {
        if (this.db) {
            await this.deleteFromIndexedDB('syncQueue', itemId);
        }
        this.syncQueue = this.syncQueue.filter(item => item.id !== itemId);
    }

    // ===== UTILITY METHODS =====

    /**
     * Save all data (for auto-save and cleanup)
     */
    async saveAllData() {
        try {
            // This method can be used for periodic backups
            const timestamp = new Date().toISOString();
            const backupData = {
                todos: await this.getAllTodos(),
                folders: await this.getAllFolders(),
                settings: await this.getSettings(),
                timestamp
            };
            
            this.saveToLocalStorage(APP_INFO.BACKUP_KEY, backupData);
        } catch (error) {
            console.error('Failed to save backup data:', error);
        }
    }

    /**
     * Migrate data from localStorage to IndexedDB
     */
    async migrateFromLocalStorage() {
        try {
            const data = this.getFromLocalStorage(APP_INFO.STORAGE_KEY);
            
            // Migrate todos
            if (data.todos?.length > 0) {
                for (const todo of data.todos) {
                    await this.saveToIndexedDB('todos', todo);
                }
            }
            
            // Migrate folders
            if (data.folders?.length > 0) {
                for (const folder of data.folders) {
                    await this.saveToIndexedDB('folders', folder);
                }
            }
            
            // Migrate settings
            if (data.settings) {
                const settingsData = {
                    key: 'app_settings',
                    value: data.settings,
                    updatedAt: new Date().toISOString()
                };
                await this.saveToIndexedDB('settings', settingsData);
            }
            
            console.log('Data migration completed');
            
        } catch (error) {
            console.error('Failed to migrate data:', error);
        }
    }

    /**
     * Clean up old data when storage is full
     */
    cleanupOldData() {
        try {
            // Remove old backups
            const backupKeys = [];
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(APP_INFO.BACKUP_KEY)) {
                    backupKeys.push(key);
                }
            }
            
            // Sort by timestamp and keep only recent ones
            backupKeys.sort().slice(0, -STORAGE.MAX_BACKUP_COUNT).forEach(key => {
                this.storage.removeItem(key);
            });
            
        } catch (error) {
            console.error('Failed to cleanup old data:', error);
        }
    }

    /**
     * Validate todo object
     * @param {Object} todo - Todo to validate
     */
    validateTodo(todo) {
        if (!todo.title || todo.title.trim().length === 0) {
            throw new Error('Todo title is required');
        }
        if (!todo.id) {
            throw new Error('Todo ID is required');
        }
    }

    /**
     * Validate folder object
     * @param {Object} folder - Folder to validate
     */
    validateFolder(folder) {
        if (!folder.name || folder.name.trim().length === 0) {
            throw new Error('Folder name is required');
        }
        if (!folder.id) {
            throw new Error('Folder ID is required');
        }
    }

    /**
     * Dispatch custom event
     * @param {string} eventName - Event name
     * @param {Object} detail - Event detail
     */
    dispatchEvent(eventName, detail = {}) {
        const event = new CustomEvent(`storage:${eventName}`, { detail });
        window.dispatchEvent(event);
    }

    /**
     * Export all data
     * @returns {Promise<Object>} Exported data
     */
    async exportData() {
        return {
            todos: await this.getAllTodos(),
            folders: await this.getAllFolders(),
            settings: await this.getSettings(),
            exportedAt: new Date().toISOString(),
            version: APP_INFO.VERSION
        };
    }

    /**
     * Import data
     * @param {Object} data - Data to import
     * @returns {Promise<Object>} Import result
     */
    async importData(data) {
        try {
            let imported = 0;
            
            // Import todos
            if (data.todos) {
                for (const todo of data.todos) {
                    await this.saveTodo(todo);
                    imported++;
                }
            }
            
            // Import folders
            if (data.folders) {
                for (const folder of data.folders) {
                    await this.saveFolder(folder);
                    imported++;
                }
            }
            
            // Import settings
            if (data.settings) {
                await this.saveSettings(data.settings);
            }
            
            return { success: true, imported };
            
        } catch (error) {
            console.error('Failed to import data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clear all data
     * @returns {Promise<void>}
     */
    async clearAllData() {
        try {
            if (this.db) {
                // Clear IndexedDB
                const stores = ['todos', 'folders', 'settings', 'syncQueue'];
                for (const storeName of stores) {
                    const transaction = this.db.transaction([storeName], 'readwrite');
                    const store = transaction.objectStore(storeName);
                    await new Promise((resolve, reject) => {
                        const request = store.clear();
                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });
                }
            }
            
            // Clear localStorage
            this.storage.removeItem(APP_INFO.STORAGE_KEY);
            this.storage.removeItem(APP_INFO.BACKUP_KEY);
            
            console.log('All data cleared');
            
        } catch (error) {
            console.error('Failed to clear data:', error);
            throw error;
        }
    }
}

export default StorageService;
