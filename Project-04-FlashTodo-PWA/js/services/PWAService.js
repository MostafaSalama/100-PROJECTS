/**
 * PWAService.js - Progressive Web App Management
 * 
 * Handles PWA installation, updates, and service worker management
 */

import { PWA, APP_INFO, UI } from '../utils/constants.js';

export class PWAService {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isUpdateAvailable = false;
        this.serviceWorker = null;
        this.installButton = null;
        this.installBanner = null;
        
        this.init();
    }

    /**
     * Initialize PWA service
     */
    async init() {
        this.checkInstallStatus();
        this.setupInstallPrompt();
        this.registerServiceWorker();
        this.setupUpdateCheck();
        this.setupInstallBanner();
        this.handleAppInstalled();
    }

    /**
     * Check if app is already installed
     */
    checkInstallStatus() {
        // Check if running as PWA
        this.isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          window.navigator.standalone === true ||
                          document.referrer.includes('android-app://');
        
        if (this.isInstalled) {
            console.log('✅ App is running as PWA');
            this.hideInstallPrompts();
        }
    }

    /**
     * Setup install prompt handling
     */
    setupInstallPrompt() {
        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('💡 PWA install prompt available');
            
            // Prevent default browser prompt
            event.preventDefault();
            
            // Store the event for later use
            this.deferredPrompt = event;
            
            // Show our custom install banner with delay
            setTimeout(() => {
                this.showInstallBanner();
            }, PWA.INSTALL_PROMPT_DELAY);
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            console.log('🎉 PWA installed successfully');
            this.handleAppInstalled();
        });
    }

    /**
     * Register service worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js', {
                    scope: '/'
                });
                
                this.serviceWorker = registration;
                console.log('✅ Service Worker registered:', registration.scope);
                
                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    console.log('🔄 Service Worker update found');
                    this.handleServiceWorkerUpdate(registration);
                });
                
                // Check for existing service worker updates
                if (registration.waiting) {
                    this.showUpdatePrompt();
                }
                
            } catch (error) {
                console.error('❌ Service Worker registration failed:', error);
            }
        } else {
            console.warn('⚠️ Service Workers not supported');
        }
    }

    /**
     * Handle service worker updates
     * @param {ServiceWorkerRegistration} registration - Service worker registration
     */
    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        if (newWorker) {
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('🆕 New app version available');
                    this.isUpdateAvailable = true;
                    this.showUpdatePrompt();
                }
            });
        }
    }

    /**
     * Setup periodic update checks
     */
    setupUpdateCheck() {
        // Check for updates periodically
        setInterval(() => {
            if (this.serviceWorker) {
                this.serviceWorker.update();
            }
        }, PWA.UPDATE_CHECK_INTERVAL);
        
        // Check for updates when app becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.serviceWorker) {
                this.serviceWorker.update();
            }
        });
    }

    /**
     * Setup install banner
     */
    setupInstallBanner() {
        this.installBanner = document.getElementById('install-banner');
        
        if (this.installBanner) {
            // Setup install button
            const installBtn = document.getElementById('install-btn');
            if (installBtn) {
                installBtn.addEventListener('click', () => {
                    this.promptInstall();
                });
            }
            
            // Setup dismiss button
            const dismissBtn = document.getElementById('install-dismiss');
            if (dismissBtn) {
                dismissBtn.addEventListener('click', () => {
                    this.hideInstallBanner();
                    this.setInstallPromptDismissed();
                });
            }
        }
    }

    /**
     * Show install banner
     */
    showInstallBanner() {
        // Don't show if already installed or dismissed recently
        if (this.isInstalled || this.isInstallPromptDismissed()) {
            return;
        }
        
        if (this.installBanner) {
            this.installBanner.classList.remove('hidden');
            this.installBanner.classList.add('show');
            
            // Auto-hide after some time
            setTimeout(() => {
                this.hideInstallBanner();
            }, 30000); // 30 seconds
        }
    }

    /**
     * Hide install banner
     */
    hideInstallBanner() {
        if (this.installBanner) {
            this.installBanner.classList.remove('show');
            this.installBanner.classList.add('hidden');
        }
    }

    /**
     * Prompt for app installation
     */
    async promptInstall() {
        if (!this.deferredPrompt) {
            console.warn('⚠️ Install prompt not available');
            return false;
        }
        
        try {
            // Show the install prompt
            this.deferredPrompt.prompt();
            
            // Wait for user response
            const choiceResult = await this.deferredPrompt.userChoice;
            
            console.log(`User choice: ${choiceResult.outcome}`);
            
            if (choiceResult.outcome === 'accepted') {
                console.log('✅ User accepted the install prompt');
                this.hideInstallBanner();
            } else {
                console.log('❌ User dismissed the install prompt');
                this.setInstallPromptDismissed();
            }
            
            // Reset the deferred prompt
            this.deferredPrompt = null;
            
            return choiceResult.outcome === 'accepted';
            
        } catch (error) {
            console.error('❌ Error prompting for install:', error);
            return false;
        }
    }

    /**
     * Show update prompt
     */
    showUpdatePrompt() {
        const shouldUpdate = confirm(
            '🚀 A new version of FlashTodo is available!\n\nWould you like to update now?'
        );
        
        if (shouldUpdate) {
            this.applyUpdate();
        }
    }

    /**
     * Apply service worker update
     */
    applyUpdate() {
        if (this.serviceWorker && this.serviceWorker.waiting) {
            // Tell the service worker to skip waiting and become active
            this.serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Reload the page to use the new service worker
            window.location.reload();
        }
    }

    /**
     * Handle app installed
     */
    handleAppInstalled() {
        this.isInstalled = true;
        this.hideInstallPrompts();
        
        // Show success message
        this.showNotification('🎉 FlashTodo installed successfully!', 'success');
        
        // Track installation (if analytics enabled)
        this.trackEvent('app_installed');
        
        // Clear install prompt dismissed flag
        localStorage.removeItem('installPromptDismissed');
    }

    /**
     * Hide all install prompts
     */
    hideInstallPrompts() {
        this.hideInstallBanner();
        
        // Hide any other install UI elements
        const installElements = document.querySelectorAll('.install-prompt');
        installElements.forEach(el => el.style.display = 'none');
    }

    /**
     * Check if install prompt was dismissed recently
     * @returns {boolean} True if dismissed recently
     */
    isInstallPromptDismissed() {
        const dismissedAt = localStorage.getItem('installPromptDismissed');
        if (!dismissedAt) return false;
        
        const dismissedTime = new Date(dismissedAt);
        const now = new Date();
        const daysSinceDismissed = (now - dismissedTime) / (1000 * 60 * 60 * 24);
        
        // Show again after 7 days
        return daysSinceDismissed < 7;
    }

    /**
     * Set install prompt as dismissed
     */
    setInstallPromptDismissed() {
        localStorage.setItem('installPromptDismissed', new Date().toISOString());
    }

    /**
     * Check if app can be installed
     * @returns {boolean} True if can be installed
     */
    canInstall() {
        return !!this.deferredPrompt && !this.isInstalled;
    }

    /**
     * Get app installation status
     * @returns {Object} Installation status
     */
    getInstallStatus() {
        return {
            isInstalled: this.isInstalled,
            canInstall: this.canInstall(),
            isUpdateAvailable: this.isUpdateAvailable,
            hasServiceWorker: !!this.serviceWorker
        };
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('pwa-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'pwa-notification';
            notification.className = 'pwa-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.className = `pwa-notification ${type} show`;
        
        // Auto-hide notification
        setTimeout(() => {
            notification.classList.remove('show');
        }, UI.TOAST_DURATION);
    }

    /**
     * Track PWA events (if analytics enabled)
     * @param {string} event - Event name
     * @param {Object} data - Event data
     */
    trackEvent(event, data = {}) {
        // This would integrate with analytics service
        console.log(`📊 PWA Event: ${event}`, data);
        
        // Dispatch custom event for app to handle
        window.dispatchEvent(new CustomEvent('pwa:event', {
            detail: { event, data, timestamp: new Date().toISOString() }
        }));
    }

    /**
     * Handle network status changes
     */
    handleNetworkChange() {
        const isOnline = navigator.onLine;
        
        if (isOnline) {
            this.showNotification('🌐 Back online!', 'success');
            this.hideOfflineIndicator();
        } else {
            this.showNotification('📶 You\'re offline', 'warning');
            this.showOfflineIndicator();
        }
        
        // Dispatch network status event
        window.dispatchEvent(new CustomEvent('pwa:network', {
            detail: { isOnline, timestamp: new Date().toISOString() }
        }));
    }

    /**
     * Show offline indicator
     */
    showOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.add('show');
        }
    }

    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    /**
     * Handle PWA shortcuts (from manifest.json)
     * @param {string} shortcut - Shortcut identifier
     */
    handleShortcut(shortcut) {
        console.log(`🔗 PWA Shortcut activated: ${shortcut}`);
        
        switch (shortcut) {
            case 'new-todo':
                // Trigger new todo creation
                window.dispatchEvent(new CustomEvent('pwa:shortcut', {
                    detail: { action: 'new-todo' }
                }));
                break;
                
            case 'completed':
                // Show completed todos
                window.dispatchEvent(new CustomEvent('pwa:shortcut', {
                    detail: { action: 'filter-completed' }
                }));
                break;
                
            default:
                console.warn('Unknown shortcut:', shortcut);
        }
    }

    /**
     * Get PWA capabilities
     * @returns {Object} PWA capabilities
     */
    getCapabilities() {
        return {
            serviceWorker: 'serviceWorker' in navigator,
            notifications: 'Notification' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            pushMessaging: 'serviceWorker' in navigator && 'PushManager' in window,
            installPrompt: !!this.deferredPrompt,
            standalone: this.isInstalled,
            offlineStorage: 'indexedDB' in window || 'localStorage' in window
        };
    }

    /**
     * Setup network status monitoring
     */
    setupNetworkMonitoring() {
        window.addEventListener('online', () => this.handleNetworkChange());
        window.addEventListener('offline', () => this.handleNetworkChange());
        
        // Initial check
        if (!navigator.onLine) {
            this.showOfflineIndicator();
        }
    }

    /**
     * Cleanup PWA service
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('beforeinstallprompt', this.handleInstallPrompt);
        window.removeEventListener('appinstalled', this.handleAppInstalled);
        window.removeEventListener('online', this.handleNetworkChange);
        window.removeEventListener('offline', this.handleNetworkChange);
        
        // Clear timers
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
        
        console.log('🧹 PWA Service cleaned up');
    }
}

export default PWAService;
