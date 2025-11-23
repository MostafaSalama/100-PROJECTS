/**
 * Service Worker for FlashTodo PWA
 * 
 * Handles caching, offline functionality, and background sync
 */

const CACHE_NAME = 'flashtodo-v1.0.0';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const MAX_CACHE_SIZE = 50;

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/main.css',
    '/css/flash-cards.css',
    '/css/folders.css',
    '/js/app.js',
    '/js/utils/constants.js',
    '/js/services/StorageService.js',
    '/js/services/PWAService.js',
    '/js/components/FlashCard.js',
    '/js/components/FolderManager.js',
    '/js/components/FilterManager.js',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap'
];

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[ServiceWorker] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Installation complete');
                return self.skipWaiting(); // Activate immediately
            })
            .catch((error) => {
                console.error('[ServiceWorker] Installation failed:', error);
            })
    );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('flashtodo-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
                        })
                        .map((name) => {
                            console.log('[ServiceWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Activation complete');
                return self.clients.claim(); // Take control immediately
            })
    );
});

// Fetch Event - Serve cached content and cache new requests
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and chrome-extension requests
    if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
        return;
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version if available
                if (response) {
                    console.log('[ServiceWorker] Serving from cache:', event.request.url);
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then((fetchResponse) => {
                        // Check if valid response
                        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
                            return fetchResponse;
                        }
                        
                        // Clone response (can only be consumed once)
                        const responseToCache = fetchResponse.clone();
                        
                        // Add to dynamic cache
                        caches.open(DYNAMIC_CACHE)
                            .then((cache) => {
                                // Limit cache size
                                limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE);
                                cache.put(event.request, responseToCache);
                            });
                        
                        return fetchResponse;
                    });
            })
            .catch(() => {
                // Offline fallback
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
                
                // For images, return a placeholder or cached version
                if (event.request.destination === 'image') {
                    return caches.match('/icons/icon-192.png');
                }
                
                // For other resources, return empty response
                return new Response('Offline', {
                    status: 408,
                    statusText: 'Offline'
                });
            })
    );
});

// Background Sync - Handle offline actions
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync-todos') {
        event.waitUntil(syncTodos());
    }
});

// Push Notifications (future feature)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    let notificationData = {
        title: 'FlashTodo',
        body: 'You have pending todos!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-96.png',
        data: { url: '/' }
    };
    
    if (event.data) {
        notificationData = { ...notificationData, ...event.data.json() };
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, notificationData)
    );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification clicked');
    
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || '/';
    
    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        })
        .then((clients) => {
            // Check if app is already open
            for (const client of clients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            
            // Open new window if app is not open
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});

// Message handling
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Utility Functions

/**
 * Limit cache size by removing oldest entries
 * @param {string} cacheName - Name of cache to limit
 * @param {number} maxSize - Maximum number of entries
 */
function limitCacheSize(cacheName, maxSize) {
    caches.open(cacheName)
        .then((cache) => {
            cache.keys()
                .then((keys) => {
                    if (keys.length > maxSize) {
                        const keysToDelete = keys.slice(0, keys.length - maxSize);
                        keysToDelete.forEach((key) => {
                            cache.delete(key);
                        });
                    }
                });
        });
}

/**
 * Sync todos when back online
 * @returns {Promise} Sync promise
 */
async function syncTodos() {
    try {
        console.log('[ServiceWorker] Syncing todos...');
        
        // Get offline actions from IndexedDB
        const offlineActions = await getOfflineActions();
        
        for (const action of offlineActions) {
            try {
                // Process each offline action
                await processOfflineAction(action);
                // Remove from offline queue
                await removeOfflineAction(action.id);
            } catch (error) {
                console.error('[ServiceWorker] Failed to sync action:', action, error);
            }
        }
        
        // Notify clients that sync is complete
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({ type: 'SYNC_COMPLETE' });
        });
        
        console.log('[ServiceWorker] Sync complete');
        
    } catch (error) {
        console.error('[ServiceWorker] Sync failed:', error);
        throw error;
    }
}

/**
 * Get offline actions from IndexedDB
 * @returns {Promise<Array>} Array of offline actions
 */
async function getOfflineActions() {
    // This would integrate with IndexedDB in a real implementation
    // For now, return empty array
    return [];
}

/**
 * Process an offline action
 * @param {Object} action - Action to process
 * @returns {Promise} Processing promise
 */
async function processOfflineAction(action) {
    // This would process offline actions like creating/updating todos
    // For now, just log the action
    console.log('[ServiceWorker] Processing offline action:', action);
}

/**
 * Remove offline action from queue
 * @param {string} actionId - ID of action to remove
 * @returns {Promise} Removal promise
 */
async function removeOfflineAction(actionId) {
    // This would remove the action from IndexedDB
    // For now, just log
    console.log('[ServiceWorker] Removing offline action:', actionId);
}

/**
 * Check if user is online
 * @returns {boolean} Online status
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Handle periodic background tasks
 */
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'background-cleanup') {
        event.waitUntil(performBackgroundCleanup());
    }
});

/**
 * Perform background cleanup tasks
 * @returns {Promise} Cleanup promise
 */
async function performBackgroundCleanup() {
    console.log('[ServiceWorker] Performing background cleanup...');
    
    // Clean up old cache entries
    limitCacheSize(DYNAMIC_CACHE, MAX_CACHE_SIZE);
    
    // Clean up old offline data (would integrate with IndexedDB)
    
    console.log('[ServiceWorker] Background cleanup complete');
}

// Export service worker version for debugging
self.SW_VERSION = CACHE_NAME;
