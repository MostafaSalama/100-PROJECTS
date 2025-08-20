// StandUp Clock Extension - Options Page JavaScript
class StandUpClockOptions {
    constructor() {
        this.settings = {
            reminderInterval: 60,
            enableReminders: true,
            enableWorkingHours: false,
            startTime: 9,
            endTime: 17,
            notificationStyle: 'friendly'
        };
        
        this.stats = {
            today: 0,
            week: 0,
            total: 0,
            streak: 0
        };
        
        this.notificationMessages = {
            friendly: [
                "Time to stand up and stretch! 🧘‍♂️",
                "Take a movement break - your body will thank you! 💪",
                "Stand up time! Get that blood flowing! 🏃‍♂️"
            ],
            professional: [
                "Reminder: Stand up for better health",
                "Time for your scheduled movement break",
                "Health break - please stand and stretch"
            ],
            motivational: [
                "ENERGY BOOST TIME! Stand up and power through! ⚡",
                "You're crushing it! Time to stand and celebrate! 🎉",
                "Movement = Motivation! Let's go! 💥"
            ]
        };
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.loadStats();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'reminderInterval',
                'enableReminders',
                'enableWorkingHours',
                'startTime',
                'endTime',
                'notificationStyle',
                'stats'
            ]);
            
            // Merge loaded settings with defaults
            this.settings = {
                reminderInterval: result.reminderInterval || 60,
                enableReminders: result.enableReminders !== false,
                enableWorkingHours: result.enableWorkingHours || false,
                startTime: result.startTime || 9,
                endTime: result.endTime || 17,
                notificationStyle: result.notificationStyle || 'friendly'
            };
            
            this.stats = result.stats || { today: 0, week: 0, total: 0, streak: 0 };
            
            console.log('Settings loaded:', this.settings);
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            await chrome.storage.sync.set(this.settings);
            
            // Notify background script of changes
            chrome.runtime.sendMessage({
                action: 'updateInterval',
                interval: this.settings.reminderInterval
            });
            
            chrome.runtime.sendMessage({
                action: 'toggleReminders',
                isActive: this.settings.enableReminders
            });
            
            console.log('Settings saved:', this.settings);
            this.showSuccessMessage();
            
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    setupEventListeners() {
        // Reminder interval input
        const intervalInput = document.getElementById('reminderInterval');
        intervalInput.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 5 && value <= 180) {
                this.settings.reminderInterval = value;
                this.updatePresetButtons(value);
            }
        });
        
        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const minutes = parseInt(e.target.dataset.minutes);
                this.settings.reminderInterval = minutes;
                intervalInput.value = minutes;
                this.updatePresetButtons(minutes);
            });
        });
        
        // Enable reminders toggle
        const enableReminders = document.getElementById('enableReminders');
        enableReminders.addEventListener('change', (e) => {
            this.settings.enableReminders = e.target.checked;
            this.updateReminderStatus();
        });
        
        // Working hours toggle
        const enableWorkingHours = document.getElementById('enableWorkingHours');
        enableWorkingHours.addEventListener('change', (e) => {
            this.settings.enableWorkingHours = e.target.checked;
            this.toggleWorkingHoursInputs(e.target.checked);
        });
        
        // Working hours time selectors
        document.getElementById('startTime').addEventListener('change', (e) => {
            this.settings.startTime = parseInt(e.target.value);
        });
        
        document.getElementById('endTime').addEventListener('change', (e) => {
            this.settings.endTime = parseInt(e.target.value);
        });
        
        // Notification style
        document.getElementById('notificationStyle').addEventListener('change', (e) => {
            this.settings.notificationStyle = e.target.value;
            this.updateNotificationPreview();
        });
        
        // Save button
        document.getElementById('saveSettings').addEventListener('click', () => {
            this.saveSettings();
        });
    }
    
    updateUI() {
        // Set input values
        document.getElementById('reminderInterval').value = this.settings.reminderInterval;
        document.getElementById('enableReminders').checked = this.settings.enableReminders;
        document.getElementById('enableWorkingHours').checked = this.settings.enableWorkingHours;
        document.getElementById('startTime').value = this.settings.startTime;
        document.getElementById('endTime').value = this.settings.endTime;
        document.getElementById('notificationStyle').value = this.settings.notificationStyle;
        
        // Update UI states
        this.updatePresetButtons(this.settings.reminderInterval);
        this.updateReminderStatus();
        this.toggleWorkingHoursInputs(this.settings.enableWorkingHours);
        this.updateNotificationPreview();
    }
    
    updatePresetButtons(selectedMinutes) {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            const minutes = parseInt(btn.dataset.minutes);
            if (minutes === selectedMinutes) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
    
    updateReminderStatus() {
        const statusText = document.getElementById('reminderStatus');
        statusText.textContent = this.settings.enableReminders ? 'Active' : 'Paused';
        statusText.style.color = this.settings.enableReminders ? '#48bb78' : '#ed8936';
    }
    
    toggleWorkingHoursInputs(enabled) {
        const workingHoursInputs = document.getElementById('workingHoursInputs');
        workingHoursInputs.style.display = enabled ? 'flex' : 'none';
    }
    
    updateNotificationPreview() {
        const previewMessage = document.getElementById('previewMessage');
        const messages = this.notificationMessages[this.settings.notificationStyle];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        previewMessage.textContent = randomMessage;
    }
    
    async loadStats() {
        try {
            const result = await chrome.storage.sync.get(['stats']);
            this.stats = result.stats || { today: 0, week: 0, total: 0, streak: 0 };
            this.updateStatsDisplay();
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    updateStatsDisplay() {
        document.getElementById('todayCount').textContent = this.stats.today;
        document.getElementById('weekCount').textContent = this.stats.week;
        document.getElementById('totalCount').textContent = this.stats.total;
        document.getElementById('streakCount').textContent = this.stats.streak || 0;
    }
    
    showSuccessMessage() {
        const successMessage = document.getElementById('successMessage');
        successMessage.classList.add('show');
        
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 3000);
    }
    
    // Method to reset statistics (could be added as a button)
    async resetStats() {
        if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
            this.stats = { today: 0, week: 0, total: 0, streak: 0 };
            await chrome.storage.sync.set({ stats: this.stats });
            this.updateStatsDisplay();
            this.showSuccessMessage();
        }
    }
}

// Initialize the options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const options = new StandUpClockOptions();
    
    // Make options instance available globally for debugging
    window.standUpOptions = options;
    
    // Auto-save when user leaves the page
    window.addEventListener('beforeunload', () => {
        options.saveSettings();
    });
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        document.getElementById('saveSettings').click();
    }
});
