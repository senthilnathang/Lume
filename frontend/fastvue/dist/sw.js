/**
 * Service Worker for Push Notifications
 *
 * Handles push notification events and click actions.
 */

// Cache name for offline support
const CACHE_NAME = 'fastvue-push-v1';

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('fastvue-push-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Push event - display notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');

  let data = {
    notification: {
      title: 'New Notification',
      body: 'You have a new notification',
      icon: '/icons/notification-icon.png',
      badge: '/icons/badge-icon.png',
      vibrate: [100, 50, 100],
    },
    data: {
      url: '/inbox',
    },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (error) {
    console.error('[SW] Error parsing push data:', error);
  }

  const { notification, data: actionData } = data;

  const options = {
    body: notification.body,
    icon: notification.icon || '/icons/notification-icon.png',
    badge: notification.badge || '/icons/badge-icon.png',
    vibrate: notification.vibrate || [100, 50, 100],
    tag: notification.tag || 'default',
    requireInteraction: notification.requireInteraction || false,
    data: actionData,
    actions: notification.actions || [],
    // Renotify for grouped notifications
    renotify: !!notification.tag,
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Notification click event - handle navigation
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  const url = event.notification.data?.url || '/inbox';

  // Handle action buttons
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);
    // Handle specific actions here if needed
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the URL
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            url: url,
            data: event.notification.data,
          });
          return client.focus();
        }
      }
      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Notification close event - track dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
  // Could send analytics here
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'mark-read') {
    event.waitUntil(syncMarkRead());
  }
});

async function syncMarkRead() {
  // Future: sync offline read actions
  console.log('[SW] Syncing mark-read actions');
}
