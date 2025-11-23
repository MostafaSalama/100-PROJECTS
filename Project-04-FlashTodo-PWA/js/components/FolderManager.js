/**
 * FolderManager.js - Folder Management Component
 * 
 * Handles folder creation, editing, deletion, and organization
 */

import { UTILS, DEFAULTS, VALIDATION, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

export class FolderManager {
    constructor(storageService, options = {}) {
        this.storageService = storageService;
        this.options = {
            onFolderCreated: null,
            onFolderUpdated: null,
            onFolderDeleted: null,
            onFolderSelected: null,
            ...options
        };
        
        this.folders = [];
        this.currentFolder = 'all';
        this.folderCounts = new Map();
        
        this.folderListElement = null;
        this.folderModal = null;
        this.folderForm = null;
        
        this.init();
    }

    /**
     * Initialize folder manager
     */
    async init() {
        this.setupElements();
        this.attachEventListeners();
        await this.loadFolders();
        this.renderFolderList();
    }

    /**
     * Setup DOM elements
     */
    setupElements() {
        this.folderListElement = document.getElementById('folder-list');
        this.folderModal = document.getElementById('folder-modal');
        this.folderForm = document.getElementById('folder-form');
        
        // Create folder list if not exists
        if (!this.folderListElement) {
            console.warn('Folder list element not found');
        }
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Add folder button
        const addFolderBtn = document.getElementById('add-folder-btn');
        if (addFolderBtn) {
            addFolderBtn.addEventListener('click', () => {
                this.showCreateFolderModal();
            });
        }

        // Folder form submission
        if (this.folderForm) {
            this.folderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFolderFormSubmit();
            });
        }

        // Modal close handlers
        if (this.folderModal) {
            const closeBtn = this.folderModal.querySelector('.modal-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hideFolderModal();
                });
            }

            const backdrop = this.folderModal.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    this.hideFolderModal();
                });
            }

            const cancelBtn = this.folderModal.querySelector('.btn-secondary');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hideFolderModal();
                });
            }
        }

        // Listen for todo changes to update counts
        window.addEventListener('storage:todoSaved', () => {
            this.updateFolderCounts();
        });

        window.addEventListener('storage:todoDeleted', () => {
            this.updateFolderCounts();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Load folders from storage
     */
    async loadFolders() {
        try {
            this.folders = await this.storageService.getAllFolders();
            await this.updateFolderCounts();
        } catch (error) {
            console.error('Failed to load folders:', error);
            this.showNotification(ERROR_MESSAGES.STORAGE.LOAD_FAILED, 'error');
        }
    }

    /**
     * Update folder todo counts
     */
    async updateFolderCounts() {
        try {
            const todos = await this.storageService.getAllTodos();
            this.folderCounts.clear();
            
            // Count all todos
            let totalCount = todos.length;
            this.folderCounts.set('all', totalCount);
            
            // Count todos in each folder
            for (const folder of this.folders) {
                const count = todos.filter(todo => todo.folder === folder.id).length;
                this.folderCounts.set(folder.id, count);
            }
            
            // Count todos without folder
            const unfoldered = todos.filter(todo => !todo.folder).length;
            if (unfoldered > 0) {
                this.folderCounts.set('unfiled', unfoldered);
            }
            
            // Update UI
            this.updateFolderCountsInUI();
            
        } catch (error) {
            console.error('Failed to update folder counts:', error);
        }
    }

    /**
     * Render folder list
     */
    renderFolderList() {
        if (!this.folderListElement) return;

        const folderItems = [];
        
        // All todos item
        folderItems.push(this.createFolderItem({
            id: 'all',
            name: 'All Todos',
            icon: '📋',
            count: this.folderCounts.get('all') || 0,
            isDefault: true
        }));

        // Regular folders
        this.folders
            .sort((a, b) => a.name.localeCompare(b.name))
            .forEach(folder => {
                folderItems.push(this.createFolderItem({
                    ...folder,
                    count: this.folderCounts.get(folder.id) || 0
                }));
            });

        // Unfiled todos (if any)
        const unfiledCount = this.folderCounts.get('unfiled') || 0;
        if (unfiledCount > 0) {
            folderItems.push(this.createFolderItem({
                id: 'unfiled',
                name: 'Unfiled',
                icon: '📄',
                count: unfiledCount,
                isSystem: true
            }));
        }

        this.folderListElement.innerHTML = folderItems.join('');
        this.attachFolderItemListeners();
    }

    /**
     * Create HTML for folder item
     * @param {Object} folder - Folder data
     * @returns {string} HTML string
     */
    createFolderItem(folder) {
        const isActive = this.currentFolder === folder.id;
        const isSystem = folder.isDefault || folder.isSystem;
        
        return `
            <div class="folder-item ${isActive ? 'active' : ''}" 
                 data-folder-id="${folder.id}">
                <span class="folder-icon">${folder.icon}</span>
                <span class="folder-name">${UTILS.sanitizeHtml(folder.name)}</span>
                <span class="folder-count" id="count-${folder.id}">${folder.count}</span>
                
                ${!isSystem ? `
                    <div class="folder-actions">
                        <button class="folder-action-btn edit-folder-btn" 
                                title="Edit folder" data-folder-id="${folder.id}">
                            ✏️
                        </button>
                        <button class="folder-action-btn delete-folder-btn" 
                                title="Delete folder" data-folder-id="${folder.id}">
                            🗑️
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Attach event listeners to folder items
     */
    attachFolderItemListeners() {
        if (!this.folderListElement) return;

        // Folder selection
        const folderItems = this.folderListElement.querySelectorAll('.folder-item');
        folderItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (e.target.closest('.folder-action-btn')) {
                    return;
                }
                
                const folderId = item.dataset.folderId;
                this.selectFolder(folderId);
            });
        });

        // Edit folder buttons
        const editButtons = this.folderListElement.querySelectorAll('.edit-folder-btn');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                this.editFolder(folderId);
            });
        });

        // Delete folder buttons
        const deleteButtons = this.folderListElement.querySelectorAll('.delete-folder-btn');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const folderId = btn.dataset.folderId;
                this.deleteFolder(folderId);
            });
        });
    }

    /**
     * Update folder counts in UI
     */
    updateFolderCountsInUI() {
        this.folderCounts.forEach((count, folderId) => {
            const countElement = document.getElementById(`count-${folderId}`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    /**
     * Select a folder
     * @param {string} folderId - Folder ID
     */
    selectFolder(folderId) {
        // Update active state
        const previousActive = this.folderListElement?.querySelector('.folder-item.active');
        if (previousActive) {
            previousActive.classList.remove('active');
        }
        
        const newActive = this.folderListElement?.querySelector(`[data-folder-id="${folderId}"]`);
        if (newActive) {
            newActive.classList.add('active');
        }
        
        // Update current folder
        this.currentFolder = folderId;
        
        // Update folder title in main view
        this.updateCurrentFolderTitle(folderId);
        
        // Notify listeners
        if (this.options.onFolderSelected) {
            this.options.onFolderSelected(folderId, this.getFolderById(folderId));
        }
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('folder:selected', {
            detail: { folderId, folder: this.getFolderById(folderId) }
        }));
    }

    /**
     * Update current folder title in main view
     * @param {string} folderId - Folder ID
     */
    updateCurrentFolderTitle(folderId) {
        const titleElement = document.getElementById('current-folder-title');
        if (titleElement) {
            const folder = this.getFolderById(folderId);
            if (folder) {
                titleElement.textContent = folder.name;
            } else if (folderId === 'all') {
                titleElement.textContent = 'All Todos';
            } else if (folderId === 'unfiled') {
                titleElement.textContent = 'Unfiled';
            }
        }
    }

    /**
     * Show create folder modal
     */
    showCreateFolderModal() {
        this.currentEditingFolder = null;
        this.resetFolderForm();
        this.showFolderModal('Add New Folder');
    }

    /**
     * Edit existing folder
     * @param {string} folderId - Folder ID
     */
    editFolder(folderId) {
        const folder = this.getFolderById(folderId);
        if (!folder) return;
        
        this.currentEditingFolder = folder;
        this.populateFolderForm(folder);
        this.showFolderModal('Edit Folder');
    }

    /**
     * Show folder modal
     * @param {string} title - Modal title
     */
    showFolderModal(title) {
        if (!this.folderModal) return;
        
        const titleElement = this.folderModal.querySelector('h3');
        if (titleElement) {
            titleElement.textContent = title;
        }
        
        this.folderModal.classList.add('show');
        
        // Focus on name input
        const nameInput = this.folderForm?.querySelector('#folder-name');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }

    /**
     * Hide folder modal
     */
    hideFolderModal() {
        if (this.folderModal) {
            this.folderModal.classList.remove('show');
            this.currentEditingFolder = null;
        }
    }

    /**
     * Reset folder form
     */
    resetFolderForm() {
        if (!this.folderForm) return;
        
        this.folderForm.reset();
        
        // Set default icon
        const iconInput = this.folderForm.querySelector('#folder-icon');
        if (iconInput) {
            iconInput.value = DEFAULTS.FOLDER.icon;
        }
    }

    /**
     * Populate folder form with existing data
     * @param {Object} folder - Folder data
     */
    populateFolderForm(folder) {
        if (!this.folderForm) return;
        
        const nameInput = this.folderForm.querySelector('#folder-name');
        const iconInput = this.folderForm.querySelector('#folder-icon');
        
        if (nameInput) nameInput.value = folder.name;
        if (iconInput) iconInput.value = folder.icon || DEFAULTS.FOLDER.icon;
    }

    /**
     * Handle folder form submission
     */
    async handleFolderFormSubmit() {
        try {
            const formData = new FormData(this.folderForm);
            const folderData = {
                name: formData.get('name')?.trim(),
                icon: formData.get('icon')?.trim() || DEFAULTS.FOLDER.icon
            };

            // Validate
            this.validateFolderData(folderData);

            // Create or update folder
            if (this.currentEditingFolder) {
                await this.updateFolder(this.currentEditingFolder.id, folderData);
            } else {
                await this.createFolder(folderData);
            }

            this.hideFolderModal();

        } catch (error) {
            console.error('Failed to save folder:', error);
            this.showNotification(error.message, 'error');
        }
    }

    /**
     * Create new folder
     * @param {Object} folderData - Folder data
     */
    async createFolder(folderData) {
        const folder = {
            id: UTILS.generateId(),
            ...DEFAULTS.FOLDER,
            ...folderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            await this.storageService.saveFolder(folder);
            this.folders.push(folder);
            this.renderFolderList();
            
            // Populate folder dropdown in todo form
            this.populateFolderSelect();
            
            this.showNotification(SUCCESS_MESSAGES.FOLDER.CREATED, 'success');
            
            if (this.options.onFolderCreated) {
                this.options.onFolderCreated(folder);
            }
            
        } catch (error) {
            throw new Error(`Failed to create folder: ${error.message}`);
        }
    }

    /**
     * Update existing folder
     * @param {string} folderId - Folder ID
     * @param {Object} folderData - Updated folder data
     */
    async updateFolder(folderId, folderData) {
        const folderIndex = this.folders.findIndex(f => f.id === folderId);
        if (folderIndex === -1) {
            throw new Error('Folder not found');
        }

        const updatedFolder = {
            ...this.folders[folderIndex],
            ...folderData,
            updatedAt: new Date().toISOString()
        };

        try {
            await this.storageService.saveFolder(updatedFolder);
            this.folders[folderIndex] = updatedFolder;
            this.renderFolderList();
            
            // Update folder dropdown in todo form
            this.populateFolderSelect();
            
            this.showNotification(SUCCESS_MESSAGES.FOLDER.UPDATED, 'success');
            
            if (this.options.onFolderUpdated) {
                this.options.onFolderUpdated(updatedFolder);
            }
            
        } catch (error) {
            throw new Error(`Failed to update folder: ${error.message}`);
        }
    }

    /**
     * Delete folder
     * @param {string} folderId - Folder ID
     */
    async deleteFolder(folderId) {
        const folder = this.getFolderById(folderId);
        if (!folder) return;

        const folderCount = this.folderCounts.get(folderId) || 0;
        let confirmMessage = `Delete folder "${folder.name}"?`;
        
        if (folderCount > 0) {
            confirmMessage = `Delete folder "${folder.name}" and move ${folderCount} todo(s) to "Unfiled"?`;
        }

        const confirmed = confirm(confirmMessage);
        if (!confirmed) return;

        try {
            // Move todos to unfiled if any
            if (folderCount > 0) {
                await this.moveTodosFromFolder(folderId, null);
            }

            // Delete folder from storage
            await this.storageService.deleteFolder(folderId);
            
            // Remove from local array
            this.folders = this.folders.filter(f => f.id !== folderId);
            
            // If currently selected folder is deleted, switch to "All"
            if (this.currentFolder === folderId) {
                this.selectFolder('all');
            }
            
            this.renderFolderList();
            this.populateFolderSelect();
            
            this.showNotification(SUCCESS_MESSAGES.FOLDER.DELETED, 'success');
            
            if (this.options.onFolderDeleted) {
                this.options.onFolderDeleted(folderId, folder);
            }
            
        } catch (error) {
            console.error('Failed to delete folder:', error);
            this.showNotification(ERROR_MESSAGES.STORAGE.SAVE_FAILED, 'error');
        }
    }

    /**
     * Move todos from one folder to another
     * @param {string} fromFolderId - Source folder ID
     * @param {string} toFolderId - Target folder ID (null for unfiled)
     */
    async moveTodosFromFolder(fromFolderId, toFolderId) {
        try {
            const todos = await this.storageService.getAllTodos();
            const todosToMove = todos.filter(todo => todo.folder === fromFolderId);
            
            for (const todo of todosToMove) {
                const updatedTodo = {
                    ...todo,
                    folder: toFolderId,
                    updatedAt: new Date().toISOString()
                };
                
                await this.storageService.saveTodo(updatedTodo);
            }
            
        } catch (error) {
            console.error('Failed to move todos:', error);
            throw error;
        }
    }

    /**
     * Populate folder select dropdown in todo form
     */
    populateFolderSelect() {
        const folderSelects = document.querySelectorAll('#todo-folder, .folder-select');
        
        folderSelects.forEach(select => {
            // Preserve current value
            const currentValue = select.value;
            
            // Clear options except first one
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = firstOption ? firstOption.outerHTML : '<option value="">No folder</option>';
            
            // Add folder options
            this.folders
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(folder => {
                    const option = document.createElement('option');
                    option.value = folder.id;
                    option.textContent = `${folder.icon} ${folder.name}`;
                    select.appendChild(option);
                });
            
            // Restore value if still valid
            if (currentValue && [...select.options].some(opt => opt.value === currentValue)) {
                select.value = currentValue;
            }
        });
    }

    /**
     * Get folder by ID
     * @param {string} folderId - Folder ID
     * @returns {Object|null} Folder object
     */
    getFolderById(folderId) {
        if (folderId === 'all') {
            return { id: 'all', name: 'All Todos', icon: '📋' };
        }
        if (folderId === 'unfiled') {
            return { id: 'unfiled', name: 'Unfiled', icon: '📄' };
        }
        return this.folders.find(f => f.id === folderId) || null;
    }

    /**
     * Get current folder
     * @returns {Object|null} Current folder
     */
    getCurrentFolder() {
        return this.getFolderById(this.currentFolder);
    }

    /**
     * Get all folders
     * @returns {Array} Array of folders
     */
    getAllFolders() {
        return [...this.folders];
    }

    /**
     * Get folder count
     * @param {string} folderId - Folder ID
     * @returns {number} Todo count
     */
    getFolderCount(folderId) {
        return this.folderCounts.get(folderId) || 0;
    }

    /**
     * Validate folder data
     * @param {Object} folderData - Folder data to validate
     */
    validateFolderData(folderData) {
        const { name, icon } = folderData;
        const validation = VALIDATION.FOLDER;

        // Name validation
        if (!name || name.length < validation.name.minLength) {
            throw new Error('Folder name is required');
        }
        if (name.length > validation.name.maxLength) {
            throw new Error(`Folder name cannot exceed ${validation.name.maxLength} characters`);
        }

        // Check for duplicate names
        const isDuplicate = this.folders.some(folder => 
            folder.name.toLowerCase() === name.toLowerCase() && 
            (!this.currentEditingFolder || folder.id !== this.currentEditingFolder.id)
        );
        
        if (isDuplicate) {
            throw new Error('A folder with this name already exists');
        }

        // Icon validation
        if (icon && icon.length > validation.icon.maxLength) {
            throw new Error(`Icon cannot exceed ${validation.icon.maxLength} characters`);
        }
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyboardShortcuts(event) {
        // Only handle if not in input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        // Cmd/Ctrl + Shift + F - Create new folder
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'F') {
            event.preventDefault();
            this.showCreateFolderModal();
        }

        // Number keys to switch between folders (1-9)
        if (event.key >= '1' && event.key <= '9') {
            const index = parseInt(event.key) - 1;
            const folderItems = this.folderListElement?.querySelectorAll('.folder-item');
            
            if (folderItems && folderItems[index]) {
                const folderId = folderItems[index].dataset.folderId;
                this.selectFolder(folderId);
            }
        }
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        window.dispatchEvent(new CustomEvent('notification:show', {
            detail: { message, type }
        }));
    }

    /**
     * Export folders data
     * @returns {Array} Folders data
     */
    exportFolders() {
        return this.folders.map(folder => ({
            ...folder,
            todoCount: this.getFolderCount(folder.id)
        }));
    }

    /**
     * Import folders data
     * @param {Array} foldersData - Folders to import
     */
    async importFolders(foldersData) {
        try {
            for (const folderData of foldersData) {
                // Generate new ID to avoid conflicts
                const folder = {
                    ...folderData,
                    id: UTILS.generateId(),
                    importedAt: new Date().toISOString()
                };
                
                delete folder.todoCount; // Remove count data
                
                await this.storageService.saveFolder(folder);
                this.folders.push(folder);
            }
            
            this.renderFolderList();
            this.populateFolderSelect();
            
        } catch (error) {
            console.error('Failed to import folders:', error);
            throw error;
        }
    }

    /**
     * Search folders
     * @param {string} query - Search query
     * @returns {Array} Filtered folders
     */
    searchFolders(query) {
        if (!query) return this.folders;
        
        const searchTerm = query.toLowerCase();
        return this.folders.filter(folder => 
            folder.name.toLowerCase().includes(searchTerm)
        );
    }

    /**
     * Destroy folder manager
     */
    destroy() {
        // Remove event listeners
        // Clean up resources
        this.folders = [];
        this.folderCounts.clear();
        console.log('Folder manager destroyed');
    }
}

export default FolderManager;
