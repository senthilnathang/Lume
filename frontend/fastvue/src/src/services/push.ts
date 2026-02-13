/**
 * Push Notification Service
 *
 * Handles Web Push notification subscription and management.
 * Works with the service worker to receive push notifications.
 */

import { ref, computed } from 'vue';
import { requestClient } from '#/api/request';

export interface PushSubscription {
  id: number;
  endpoint: string;
  device_name: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface VapidKeyResponse {
  public_key: string | null;
  enabled: boolean;
}

class PushService {
  private _isSupported = ref(false);
  private _isSubscribed = ref(false);
  private _isLoading = ref(false);
  private _permission = ref<NotificationPermission>('default');
  private _vapidKey = ref<string | null>(null);
  private _error = ref<string | null>(null);
  private _swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this._isSupported.value = this.checkSupport();
    if (this._isSupported.value) {
      this._permission.value = Notification.permission;
    }
  }

  // Public reactive getters
  get isSupported() {
    return computed(() => this._isSupported.value);
  }

  get isSubscribed() {
    return computed(() => this._isSubscribed.value);
  }

  get isLoading() {
    return computed(() => this._isLoading.value);
  }

  get permission() {
    return computed(() => this._permission.value);
  }

  get error() {
    return computed(() => this._error.value);
  }

  get canSubscribe() {
    return computed(
      () =>
        this._isSupported.value &&
        this._permission.value !== 'denied' &&
        !!this._vapidKey.value
    );
  }

  /**
   * Check if push notifications are supported
   */
  private checkSupport(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /**
   * Initialize the push service
   */
  async initialize(): Promise<boolean> {
    if (!this._isSupported.value) {
      this._error.value = 'Push notifications are not supported in this browser';
      return false;
    }

    try {
      this._isLoading.value = true;
      this._error.value = null;

      // Get VAPID key from server
      const vapidResponse = await requestClient.get<VapidKeyResponse>(
        '/push/vapid-key'
      );

      if (!vapidResponse.enabled || !vapidResponse.public_key) {
        this._error.value = 'Push notifications are not configured on the server';
        return false;
      }

      this._vapidKey.value = vapidResponse.public_key;

      // Register service worker
      this._swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[Push] Service worker registered');

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check existing subscription
      const subscription =
        await this._swRegistration.pushManager.getSubscription();
      this._isSubscribed.value = !!subscription;

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      return true;
    } catch (error) {
      console.error('[Push] Initialization failed:', error);
      this._error.value =
        error instanceof Error ? error.message : 'Failed to initialize push notifications';
      return false;
    } finally {
      this._isLoading.value = false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this._isSupported.value) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this._permission.value = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('[Push] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(deviceName?: string): Promise<boolean> {
    if (!this.canSubscribe.value) {
      this._error.value = 'Cannot subscribe: check permissions and server config';
      return false;
    }

    if (!this._swRegistration) {
      this._error.value = 'Service worker not registered';
      return false;
    }

    try {
      this._isLoading.value = true;
      this._error.value = null;

      // Request permission if not granted
      if (this._permission.value !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) {
          this._error.value = 'Notification permission denied';
          return false;
        }
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = this.urlBase64ToUint8Array(
        this._vapidKey.value!
      ) as BufferSource;

      // Subscribe to push manager
      const subscription = await this._swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // Get keys from subscription
      const keys = subscription.toJSON().keys;
      if (!keys) {
        throw new Error('Failed to get subscription keys');
      }

      // Send subscription to server
      await requestClient.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
        device_name: deviceName || this.getDeviceName(),
      });

      this._isSubscribed.value = true;
      console.log('[Push] Subscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Subscription failed:', error);
      this._error.value =
        error instanceof Error ? error.message : 'Failed to subscribe';
      return false;
    } finally {
      this._isLoading.value = false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this._swRegistration) {
      return false;
    }

    try {
      this._isLoading.value = true;
      this._error.value = null;

      const subscription =
        await this._swRegistration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove from server
        await requestClient.post('/push/unsubscribe', null, {
          params: { endpoint: subscription.endpoint },
        });
      }

      this._isSubscribed.value = false;
      console.log('[Push] Unsubscribed successfully');
      return true;
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
      this._error.value =
        error instanceof Error ? error.message : 'Failed to unsubscribe';
      return false;
    } finally {
      this._isLoading.value = false;
    }
  }

  /**
   * Get all subscriptions for current user
   */
  async getSubscriptions(): Promise<PushSubscription[]> {
    try {
      return await requestClient.get<PushSubscription[]>('/push/subscriptions');
    } catch (error) {
      console.error('[Push] Failed to get subscriptions:', error);
      return [];
    }
  }

  /**
   * Delete a specific subscription
   */
  async deleteSubscription(subscriptionId: number): Promise<boolean> {
    try {
      await requestClient.delete(`/push/subscriptions/${subscriptionId}`);
      return true;
    } catch (error) {
      console.error('[Push] Failed to delete subscription:', error);
      return false;
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(
    title = 'Test Notification',
    body = 'This is a test push notification'
  ): Promise<boolean> {
    try {
      await requestClient.post('/push/test', { title, body });
      return true;
    } catch (error) {
      console.error('[Push] Failed to send test notification:', error);
      return false;
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { type, url, data } = event.data;

    if (type === 'NOTIFICATION_CLICK') {
      console.log('[Push] Notification clicked, navigating to:', url);
      // Emit event for navigation
      window.dispatchEvent(
        new CustomEvent('push-notification-click', {
          detail: { url, data },
        })
      );
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  /**
   * Get a friendly device name
   */
  private getDeviceName(): string {
    const ua = navigator.userAgent;

    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux PC';

    return 'Unknown Device';
  }
}

// Create singleton instance
export const pushService = new PushService();

// Export class for testing
export { PushService };
