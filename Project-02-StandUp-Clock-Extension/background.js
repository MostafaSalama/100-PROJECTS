// StandUp Clock Extension - Background Service Worker
class StandUpClockBackground {
    constructor() {
        this.reminderInterval = 60; // Default 60 minutes
        this.isActive = true;
        this.snoozeUntil = null;
        this.lastStandUp = Date.now();
        this.stats = { today: 0, week: 0, total: 0 };
        this.lastResetDate = this.getTodayString();
        
        this.init();
    }
    
    async init() {
        console.log('StandUp Clock Background Service Worker initialized');
        
        // Load saved settings
        await this.loadSettings();
        
        // Set up alarm for reminders
        this.setupReminders();
        
        // Setup message listeners
        this.setupMessageListeners();
        
        // Setup alarm listeners
        this.setupAlarmListeners();
        
        // Daily stats reset
        this.setupDailyReset();
        
        // Weekly stats reset  
        this.setupWeeklyReset();
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'reminderInterval',
                'isActive',
                'stats',
                'lastStandUp',
                'snoozeUntil',
                'lastResetDate',
                'weekStartDate'
            ]);
            
            this.reminderInterval = result.reminderInterval || 60;
            this.isActive = result.isActive !== false;
            this.stats = result.stats || { today: 0, week: 0, total: 0 };
            this.lastStandUp = result.lastStandUp || Date.now();
            this.snoozeUntil = result.snoozeUntil || null;
            this.lastResetDate = result.lastResetDate || this.getTodayString();
            this.weekStartDate = result.weekStartDate || this.getWeekStartString();
            
            console.log('Settings loaded:', {
                reminderInterval: this.reminderInterval,
                isActive: this.isActive,
                stats: this.stats
            });
            
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                reminderInterval: this.reminderInterval,
                isActive: this.isActive,
                stats: this.stats,
                lastStandUp: this.lastStandUp,
                snoozeUntil: this.snoozeUntil,
                lastResetDate: this.lastResetDate,
                weekStartDate: this.weekStartDate
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    setupReminders() {
        // Clear existing alarms
        chrome.alarms.clear('standupReminder');
        
        if (this.isActive) {
            // Set up recurring alarm
            chrome.alarms.create('standupReminder', {
                delayInMinutes: this.reminderInterval,
                periodInMinutes: this.reminderInterval
            });
            console.log(`Reminder set for every ${this.reminderInterval} minutes`);
        }
    }
    
    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'toggleReminders':
                    this.handleToggleReminders(message.isActive);
                    break;
                    
                case 'updateInterval':
                    this.handleUpdateInterval(message.interval);
                    break;
                    
                case 'snoozeReminders':
                    this.handleSnoozeReminders(message.snoozeUntil);
                    break;
                    
                case 'recordStandUp':
                    this.handleRecordStandUp(message.timestamp);
                    break;
                    
                case 'getStats':
                    sendResponse({ stats: this.stats });
                    break;
                    
                default:
                    break;
            }
            return true; // Keep message channel open for async responses
        });
    }
    
    setupAlarmListeners() {
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'standupReminder') {
                this.handleReminderAlarm();
            } else if (alarm.name === 'dailyReset') {
                this.handleDailyReset();
            } else if (alarm.name === 'weeklyReset') {
                this.handleWeeklyReset();
            }
        });
    }
    
    setupDailyReset() {
        // Clear existing daily reset alarm
        chrome.alarms.clear('dailyReset');
        
        // Set alarm for midnight
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Next midnight
        
        const minutesUntilMidnight = Math.floor((midnight - now) / (1000 * 60));
        
        chrome.alarms.create('dailyReset', {
            delayInMinutes: minutesUntilMidnight,
            periodInMinutes: 24 * 60 // Every 24 hours
        });
        
        console.log(`Daily reset scheduled in ${minutesUntilMidnight} minutes`);
    }
    
    setupWeeklyReset() {
        // Set up weekly reset (every Monday at midnight)
        const now = new Date();
        const nextMonday = new Date();
        const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
        
        nextMonday.setDate(now.getDate() + daysUntilMonday);
        nextMonday.setHours(0, 0, 0, 0);
        
        const minutesUntilMonday = Math.floor((nextMonday - now) / (1000 * 60));
        
        chrome.alarms.create('weeklyReset', {
            delayInMinutes: minutesUntilMonday,
            periodInMinutes: 7 * 24 * 60 // Every week
        });
        
        console.log(`Weekly reset scheduled in ${minutesUntilMonday} minutes`);
    }
    
    async handleReminderAlarm() {
        console.log('Reminder alarm triggered');
        
        // Check if reminders are active
        if (!this.isActive) {
            console.log('Reminders are paused');
            return;
        }
        
        // Check if snoozed
        const now = Date.now();
        if (this.snoozeUntil && now < this.snoozeUntil) {
            console.log('Reminders are snoozed');
            return;
        }
        
        // Show notification
        await this.showStandUpNotification();
        
        // Update badge
        this.updateBadge();
    }
    
    async showStandUpNotification() {
        const motivationalMessages = [
            "Time to stand up and stretch! 🧘‍♂️",
            "Take a movement break - your body will thank you! 💪",
            "Stand up time! Get that blood flowing! 🏃‍♂️",
            "Stretch break! Stand up and reach for the sky! ⭐",
            "Movement moment! Stand up and take a deep breath! 🌬️",
            "Time for a healthy break! Stand and move around! 🚶‍♀️",
            "Stand up reminder! Your posture will improve! 📏",
            "Health break! Stand up and energize yourself! ⚡",
            "Time to move! Stand up and feel refreshed! 🌿",
            "Stand tall! Time for your movement break! 🦋"
        ];
        
        const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        
        try {
            await chrome.notifications.create('standupReminder', {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'StandUp Clock Reminder',
                message: randomMessage,
                buttons: [
                    { title: 'I Stood Up! ✅' },
                    { title: 'Snooze 15min ⏰' }
                ],
                requireInteraction: true,
                priority: 2
            });
            
            console.log('Notification shown');
            
            // Auto-clear notification after 30 seconds if no interaction
            setTimeout(() => {
                chrome.notifications.clear('standupReminder');
            }, 30000);
            
        } catch (error) {
            console.error('Error showing notification:', error);
        }
        
        // Setup notification click handlers
        this.setupNotificationHandlers();
    }
    
    setupNotificationHandlers() {
        // Handle notification button clicks
        chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
            if (notificationId === 'standupReminder') {
                if (buttonIndex === 0) {
                    // "I Stood Up!" button
                    this.handleRecordStandUp(Date.now());
                } else if (buttonIndex === 1) {
                    // "Snooze 15min" button
                    this.handleSnoozeReminders(Date.now() + (15 * 60 * 1000));
                }
                chrome.notifications.clear(notificationId);
            }
        });
        
        // Handle notification click (not button click)
        chrome.notifications.onClicked.addListener((notificationId) => {
            if (notificationId === 'standupReminder') {
                // Open popup or options page
                chrome.action.openPopup();
                chrome.notifications.clear(notificationId);
            }
        });
    }
    
    updateBadge() {
        if (this.isActive) {
            chrome.action.setBadgeText({ text: '⏰' });
            chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        } else {
            chrome.action.setBadgeText({ text: '' });
        }
    }
    
    async handleToggleReminders(isActive) {
        this.isActive = isActive;
        await this.saveSettings();
        
        if (isActive) {
            this.setupReminders();
        } else {
            chrome.alarms.clear('standupReminder');
        }
        
        this.updateBadge();
        console.log(`Reminders ${isActive ? 'activated' : 'paused'}`);
    }
    
    async handleUpdateInterval(interval) {
        this.reminderInterval = interval;
        await this.saveSettings();
        
        if (this.isActive) {
            this.setupReminders(); // Recreate alarm with new interval
        }
        
        console.log(`Reminder interval updated to ${interval} minutes`);
    }
    
    async handleSnoozeReminders(snoozeUntil) {
        this.snoozeUntil = snoozeUntil;
        await this.saveSettings();
        
        console.log(`Reminders snoozed until ${new Date(snoozeUntil)}`);
    }
    
    async handleRecordStandUp(timestamp) {
        this.lastStandUp = timestamp;
        this.snoozeUntil = null; // Clear snooze
        
        // Update stats
        this.stats.today += 1;
        this.stats.week += 1;
        this.stats.total += 1;
        
        await this.saveSettings();
        
        // Clear any existing reminder notifications
        chrome.notifications.clear('standupReminder');
        
        // Show success notification
        chrome.notifications.create('standupSuccess', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Great Job! 🎉',
            message: `Stand-up recorded! Total today: ${this.stats.today}`,
            priority: 1
        });
        
        // Auto-clear success notification
        setTimeout(() => {
            chrome.notifications.clear('standupSuccess');
        }, 3000);
        
        console.log('Stand-up recorded:', { timestamp, stats: this.stats });
    }
    
    async handleDailyReset() {
        const today = this.getTodayString();
        
        if (today !== this.lastResetDate) {
            console.log('Performing daily reset');
            this.stats.today = 0;
            this.lastResetDate = today;
            await this.saveSettings();
        }
    }
    
    async handleWeeklyReset() {
        const weekStart = this.getWeekStartString();
        
        if (weekStart !== this.weekStartDate) {
            console.log('Performing weekly reset');
            this.stats.week = 0;
            this.weekStartDate = weekStart;
            await this.saveSettings();
        }
    }
    
    getTodayString() {
        const today = new Date();
        return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    }
    
    getWeekStartString() {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay()); // Go to Sunday
        return this.dateToString(startOfWeek);
    }
    
    dateToString(date) {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
}

// Initialize the background service worker
const standUpClock = new StandUpClockBackground();

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('StandUp Clock Extension installed/updated');
    
    if (details.reason === 'install') {
        // Show welcome notification
        chrome.notifications.create('welcome', {
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Welcome to StandUp Clock! 🎉',
            message: 'Your health reminder is now active. Click the icon to customize settings.',
            priority: 2
        });
        
        // Open options page on first install
        setTimeout(() => {
            chrome.runtime.openOptionsPage();
        }, 2000);
    }
    
    // Set initial badge
    standUpClock.updateBadge();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('StandUp Clock Extension started');
    standUpClock.updateBadge();
});