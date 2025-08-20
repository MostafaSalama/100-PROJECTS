// Digital Clock JavaScript
class DigitalClock {
    constructor() {
        this.timeElements = {
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds'),
            period: document.getElementById('period')
        };
        
        this.dateElements = {
            day: document.getElementById('day'),
            month: document.getElementById('month'),
            dayNum: document.getElementById('dayNum'),
            year: document.getElementById('year')
        };
        
        this.formatToggle = document.getElementById('formatToggle');
        this.is24Hour = false;
        
        this.init();
    }
    
    init() {
        // Start the clock immediately
        this.updateClock();
        
        // Update clock every second
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);
        
        // Add event listener for format toggle
        this.formatToggle.addEventListener('click', () => {
            this.toggleFormat();
        });
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.toggleFormat();
            }
        });
    }
    
    updateClock() {
        const now = new Date();
        
        // Update time
        this.updateTime(now);
        
        // Update date
        this.updateDate(now);
    }
    
    updateTime(date) {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        let period = '';
        
        if (!this.is24Hour) {
            // 12-hour format
            period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // 0 should be 12
        } else {
            // 24-hour format - no period needed
            period = '';
        }
        
        // Format with leading zeros
        const formattedHours = this.padZero(hours);
        const formattedMinutes = this.padZero(minutes);
        const formattedSeconds = this.padZero(seconds);
        
        // Update DOM elements with smooth transition
        this.updateElementWithTransition(this.timeElements.hours, formattedHours);
        this.updateElementWithTransition(this.timeElements.minutes, formattedMinutes);
        this.updateElementWithTransition(this.timeElements.seconds, formattedSeconds);
        
        // Handle period display
        if (this.is24Hour) {
            this.timeElements.period.style.display = 'none';
        } else {
            this.timeElements.period.style.display = 'block';
            this.updateElementWithTransition(this.timeElements.period, period);
        }
    }
    
    updateDate(date) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const dayName = days[date.getDay()];
        const monthName = months[date.getMonth()];
        const dayNumber = date.getDate();
        const year = date.getFullYear();
        
        // Add ordinal suffix to day number
        const dayWithSuffix = this.addOrdinalSuffix(dayNumber);
        
        this.dateElements.day.textContent = dayName;
        this.dateElements.month.textContent = monthName;
        this.dateElements.dayNum.textContent = dayWithSuffix;
        this.dateElements.year.textContent = year;
    }
    
    updateElementWithTransition(element, newValue) {
        if (element.textContent !== newValue) {
            element.style.transform = 'scale(1.1)';
            setTimeout(() => {
                element.textContent = newValue;
                element.style.transform = 'scale(1)';
            }, 150);
        }
    }
    
    padZero(number) {
        return number.toString().padStart(2, '0');
    }
    
    addOrdinalSuffix(number) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const value = number % 100;
        
        return number + (suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]);
    }
    
    toggleFormat() {
        this.is24Hour = !this.is24Hour;
        
        // Update button text
        this.formatToggle.textContent = this.is24Hour ? '12 Hour Format' : '24 Hour Format';
        
        // Add visual feedback
        this.formatToggle.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.formatToggle.style.transform = 'scale(1)';
        }, 150);
        
        // Immediately update the clock with new format
        this.updateClock();
        
        // Store preference in localStorage
        localStorage.setItem('clockFormat', this.is24Hour ? '24' : '12');
    }
    
    // Load saved format preference
    loadPreferences() {
        const savedFormat = localStorage.getItem('clockFormat');
        if (savedFormat) {
            this.is24Hour = savedFormat === '24';
            this.formatToggle.textContent = this.is24Hour ? '12 Hour Format' : '24 Hour Format';
        }
    }
    
    // Clean up method
    destroy() {
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
    }
}

// Enhanced features and animations
class ClockEnhancements {
    constructor(clock) {
        this.clock = clock;
        this.init();
    }
    
    init() {
        this.addTimezoneSupport();
        this.addThemeToggle();
        this.addFullscreenSupport();
        this.addSoundToggle();
    }
    
    addTimezoneSupport() {
        // This could be extended to support multiple timezones
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('Current timezone:', timezone);
    }
    
    addThemeToggle() {
        // Add a subtle theme variation on double-click
        document.addEventListener('dblclick', () => {
            document.body.classList.toggle('dark-theme');
        });
    }
    
    addFullscreenSupport() {
        // Toggle fullscreen on F11 or Ctrl+F
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11' || (e.ctrlKey && e.key === 'f')) {
                e.preventDefault();
                this.toggleFullscreen();
            }
        });
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen error:', err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    
    addSoundToggle() {
        // Could add tick sound or hourly chimes
        // This is a placeholder for future enhancement
        let soundEnabled = false;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 's' || e.key === 'S') {
                soundEnabled = !soundEnabled;
                console.log('Sound:', soundEnabled ? 'enabled' : 'disabled');
                // Visual feedback could be added here
            }
        });
    }
}

// Initialize the clock when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create the main clock instance
    const digitalClock = new DigitalClock();
    
    // Load saved preferences
    digitalClock.loadPreferences();
    
    // Initialize enhanced features
    const clockEnhancements = new ClockEnhancements(digitalClock);
    
    // Add welcome animation
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        digitalClock.destroy();
    });
});

// Performance monitoring (optional)
if ('performance' in window) {
    window.addEventListener('load', () => {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
    });
}
