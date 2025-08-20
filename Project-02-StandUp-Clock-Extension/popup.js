// StandUp Clock Extension - Popup JavaScript
class StandUpClockPopup {
    constructor() {
        this.isRemindersActive = true;
        this.nextReminderTime = null;
        this.updateInterval = null;
        this.stats = {
            today: 0,
            week: 0,
            total: 0
        };
        
        this.healthTips = [
            "Standing for 2-3 minutes every hour can improve circulation and reduce back strain!",
            "Take a short walk during your stand-up break to boost energy and creativity.",
            "Simple stretches while standing can help prevent muscle stiffness.",
            "Standing meetings can increase productivity and engagement.",
            "Regular movement breaks can improve focus and reduce eye strain.",
            "Deep breathing while standing can help reduce stress and tension.",
            "Standing and moving helps prevent the negative effects of prolonged sitting.",
            "A quick 2-minute movement break can boost your metabolism.",
            "Standing reminders help maintain better posture throughout the day.",
            "Regular breaks improve blood flow and reduce the risk of blood clots."
        ];
        
        this.init();
    }
    
    async init() {
        // Initialize DOM elements
        this.initializeElements();
        
        // Load saved data
        await this.loadData();
        
        // Start clock updates
        this.startClockUpdates();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Update reminder status
        this.updateReminderStatus();
        
        // Display random health tip
        this.displayRandomTip();
        
        // Check for background script communication
        this.setupBackgroundCommunication();
    }
    
    initializeElements() {
        // Clock elements
        this.elements = {
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds'),
            period: document.getElementById('period'),
            dayName: document.getElementById('dayName'),
            monthName: document.getElementById('monthName'),
            dayNum: document.getElementById('dayNum'),
            year: document.getElementById('year'),
            
            // Reminder elements
            statusIndicator: document.getElementById('statusIndicator'),
            statusMessage: document.getElementById('statusMessage'),
            nextReminder: document.getElementById('nextReminder'),
            toggleReminders: document.getElementById('toggleReminders'),
            toggleIcon: document.getElementById('toggleIcon'),
            toggleText: document.getElementById('toggleText'),
            snoozeBtn: document.getElementById('snoozeBtn'),
            standNowBtn: document.getElementById('standNowBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // Stats elements
            todayStandUps: document.getElementById('todayStandUps'),
            weekStandUps: document.getElementById('weekStandUps'),
            totalStandUps: document.getElementById('totalStandUps'),
            
            // Health tip
            healthTip: document.getElementById('healthTip')
        };
    }
    
    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'reminderInterval',
                'isActive',
                'stats',
                'lastStandUp',
                'snoozeUntil'
            ]);
            
            this.reminderInterval = result.reminderInterval || 60; // Default 60 minutes
            this.isRemindersActive = result.isActive !== false; // Default true
            this.stats = result.stats || { today: 0, week: 0, total: 0 };
            this.lastStandUp = result.lastStandUp || Date.now();
            this.snoozeUntil = result.snoozeUntil || null;
            
            // Update UI with loaded data
            this.updateStatsDisplay();
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    async saveData() {
        try {
            await chrome.storage.sync.set({
                isActive: this.isRemindersActive,
                stats: this.stats,
                lastStandUp: this.lastStandUp,
                snoozeUntil: this.snoozeUntil
            });
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    startClockUpdates() {
        this.updateClock();
        this.updateInterval = setInterval(() => {
            this.updateClock();
            this.updateReminderStatus();
        }, 1000);
    }
    
    updateClock() {
        const now = new Date();
        
        // Update time
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const seconds = now.getSeconds();
        
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        
        this.elements.hours.textContent = hours.toString().padStart(2, '0');
        this.elements.minutes.textContent = minutes.toString().padStart(2, '0');
        this.elements.seconds.textContent = seconds.toString().padStart(2, '0');
        this.elements.period.textContent = period;
        
        // Update date
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        this.elements.dayName.textContent = days[now.getDay()];
        this.elements.monthName.textContent = months[now.getMonth()];
        this.elements.dayNum.textContent = this.addOrdinalSuffix(now.getDate());
        this.elements.year.textContent = now.getFullYear();
    }
    
    addOrdinalSuffix(number) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const value = number % 100;
        return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
    }
    
    updateReminderStatus() {
        const now = Date.now();
        const reminderSection = document.querySelector('.reminder-status');
        
        if (!this.isRemindersActive) {
            reminderSection.className = 'reminder-status disabled';
            this.elements.statusIndicator.style.background = '#a0aec0';
            this.elements.statusMessage.innerHTML = 'Reminders are paused';
            return;
        }
        
        if (this.snoozeUntil && now < this.snoozeUntil) {
            reminderSection.className = 'reminder-status paused';
            const minutesLeft = Math.ceil((this.snoozeUntil - now) / (1000 * 60));
            this.elements.statusMessage.innerHTML = `Snoozed for <span id="nextReminder">${minutesLeft} min</span>`;
            return;
        }
        
        // Calculate next reminder time
        const timeSinceLastStandUp = now - this.lastStandUp;
        const reminderIntervalMs = this.reminderInterval * 60 * 1000;
        const timeToNextReminder = reminderIntervalMs - (timeSinceLastStandUp % reminderIntervalMs);
        const minutesToNext = Math.ceil(timeToNextReminder / (1000 * 60));
        
        reminderSection.className = 'reminder-status';
        this.elements.statusMessage.innerHTML = `Active - Next reminder in <span id="nextReminder">${minutesToNext} min</span>`;
    }
    
    updateStatsDisplay() {
        this.elements.todayStandUps.textContent = this.stats.today;
        this.elements.weekStandUps.textContent = this.stats.week;
        this.elements.totalStandUps.textContent = this.stats.total;
    }
    
    setupEventListeners() {
        // Toggle reminders
        this.elements.toggleReminders.addEventListener('click', () => {
            this.toggleReminders();
        });
        
        // Snooze button
        this.elements.snoozeBtn.addEventListener('click', () => {
            this.snoozeReminders(15); // 15 minutes
        });
        
        // Stand now button
        this.elements.standNowBtn.addEventListener('click', () => {
            this.recordStandUp();
        });
        
        // Settings button
        this.elements.settingsBtn.addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });
    }
    
    async toggleReminders() {
        this.isRemindersActive = !this.isRemindersActive;
        
        // Update button appearance
        if (this.isRemindersActive) {
            this.elements.toggleIcon.textContent = '⏸️';
            this.elements.toggleText.textContent = 'Pause';
            this.elements.toggleReminders.className = 'action-btn primary';
        } else {
            this.elements.toggleIcon.textContent = '▶️';
            this.elements.toggleText.textContent = 'Resume';
            this.elements.toggleReminders.className = 'action-btn secondary';
        }
        
        // Save state
        await this.saveData();
        
        // Notify background script
        chrome.runtime.sendMessage({
            action: 'toggleReminders',
            isActive: this.isRemindersActive
        });
        
        // Update status immediately
        this.updateReminderStatus();
        
        // Add visual feedback
        this.showFeedback(this.isRemindersActive ? 'Reminders activated! 🔔' : 'Reminders paused 😴');
    }
    
    async snoozeReminders(minutes) {
        this.snoozeUntil = Date.now() + (minutes * 60 * 1000);
        await this.saveData();
        
        chrome.runtime.sendMessage({
            action: 'snoozeReminders',
            snoozeUntil: this.snoozeUntil
        });
        
        this.updateReminderStatus();
        this.showFeedback(`Snoozed for ${minutes} minutes 😴`);
    }
    
    async recordStandUp() {
        this.lastStandUp = Date.now();
        this.snoozeUntil = null; // Clear any active snooze
        
        // Update stats
        this.stats.today += 1;
        this.stats.week += 1;
        this.stats.total += 1;
        
        await this.saveData();
        
        chrome.runtime.sendMessage({
            action: 'recordStandUp',
            timestamp: this.lastStandUp
        });
        
        this.updateStatsDisplay();
        this.updateReminderStatus();
        
        // Show congratulatory message
        const encouragements = [
            'Great job! 🎉',
            'Keep it up! 💪',
            'Excellent! 🌟',
            'Well done! 👏',
            'Fantastic! ⭐',
            'You rock! 🎸'
        ];
        const randomEncouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
        this.showFeedback(randomEncouragement);
        
        // Display new health tip
        this.displayRandomTip();
    }
    
    displayRandomTip() {
        const randomTip = this.healthTips[Math.floor(Math.random() * this.healthTips.length)];
        this.elements.healthTip.textContent = randomTip;
    }
    
    showFeedback(message) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'feedback-message';
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: 500;
            box-shadow: 0 4px 15px rgba(72, 187, 120, 0.4);
            z-index: 1000;
            animation: feedbackSlide 3s ease-out forwards;
        `;
        
        // Add keyframes for animation
        if (!document.querySelector('#feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'feedback-styles';
            style.textContent = `
                @keyframes feedbackSlide {
                    0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    10%, 90% { opacity: 1; transform: translateX(-50%) translateY(0); }
                    100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 3000);
    }
    
    setupBackgroundCommunication() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            switch (message.action) {
                case 'reminderTriggered':
                    this.updateReminderStatus();
                    break;
                case 'statsUpdated':
                    this.stats = message.stats;
                    this.updateStatsDisplay();
                    break;
                default:
                    break;
            }
        });
    }
    
    // Cleanup when popup closes
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const popup = new StandUpClockPopup();
    
    // Clean up on unload
    window.addEventListener('beforeunload', () => {
        popup.destroy();
    });
});

// Handle popup close
window.addEventListener('unload', () => {
    // Final save if needed
    if (window.popup) {
        window.popup.saveData();
    }
});