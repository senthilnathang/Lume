/**
 * Trust Store
 *
 * Zero Trust state management for the frontend:
 * - Trust level tracking
 * - Step-up authentication state
 * - Session information
 * - Device management
 *
 * Note: This store uses lazy-loaded request client to avoid circular dependencies.
 * The request client is injected via the provider pattern.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import {
  getFingerprintHeader,
  initializeFingerprint,
} from '#/utils/fingerprint';

// Lazy-load request client to avoid circular dependency
// The request client depends on the provider which uses this store
let _requestClient: typeof import('#/api/request').requestClient | null = null;

async function getRequestClient() {
  if (!_requestClient) {
    const { requestClient } = await import('#/api/request');
    _requestClient = requestClient;
  }
  return _requestClient;
}

// Types
export interface TrustLevel {
  level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  score: number;
  riskScore: number;
}

export interface SecuritySession {
  id: number;
  sessionId: string;
  deviceId: number | null;
  trustLevel: string;
  riskScore: number;
  ipAddress: string;
  userAgent: string;
  location: Record<string, unknown> | null;
  startedAt: string;
  lastActivityAt: string;
  isCurrentSession: boolean;
}

export interface KnownDevice {
  id: number;
  deviceFingerprint: string;
  deviceName: string;
  deviceType: string;
  browserInfo: Record<string, unknown>;
  osInfo: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  lastIpAddress: string;
  trustScore: number;
  isTrusted: boolean;
  isBlocked: boolean;
  isCurrentDevice: boolean;
}

export interface SecurityEvent {
  id: number;
  eventType: string;
  eventData: Record<string, unknown>;
  riskImpact: number;
  ipAddress: string;
  createdAt: string;
}

export interface StepUpState {
  required: boolean;
  reason: string | null;
  method: string | null;
  sessionId: string | null;
}

// Store
export const useTrustStore = defineStore('trust', () => {
  // State
  const trustLevel = ref<TrustLevel>({
    level: 'low',
    score: 50,
    riskScore: 0,
  });

  const stepUp = ref<StepUpState>({
    required: false,
    reason: null,
    method: null,
    sessionId: null,
  });

  const sessions = ref<SecuritySession[]>([]);
  const devices = ref<KnownDevice[]>([]);
  const recentEvents = ref<SecurityEvent[]>([]);
  const deviceFingerprint = ref<string | null>(null);
  const isInitialized = ref(false);
  const isLoading = ref(false);

  // Computed
  const currentTrustLevel = computed(() => trustLevel.value.level);
  const trustScore = computed(() => trustLevel.value.score);
  const riskScore = computed(() => trustLevel.value.riskScore);

  const isHighRisk = computed(() => trustLevel.value.riskScore > 50);
  const requiresStepUp = computed(() => stepUp.value.required);

  const activeSessions = computed(() =>
    sessions.value.filter((s) => !s.isCurrentSession),
  );

  const currentSession = computed(() =>
    sessions.value.find((s) => s.isCurrentSession),
  );

  const trustedDevices = computed(() =>
    devices.value.filter((d) => d.isTrusted),
  );

  const currentDevice = computed(() =>
    devices.value.find((d) => d.isCurrentDevice),
  );

  // Actions
  async function initialize() {
    if (isInitialized.value) return;

    try {
      // Initialize device fingerprint
      deviceFingerprint.value = await initializeFingerprint();

      // Fetch trust status
      await fetchTrustLevel();

      isInitialized.value = true;
    } catch (error) {
      console.error('Failed to initialize trust store:', error);
    }
  }

  async function fetchTrustLevel() {
    try {
      const client = await getRequestClient();
      const response = await client.get<{
        trustLevel: string;
        trustScore: number;
        riskScore: number;
      }>('/zero-trust/trust-level');

      trustLevel.value = {
        level: response.trustLevel as TrustLevel['level'],
        score: response.trustScore,
        riskScore: response.riskScore,
      };
    } catch (error) {
      console.error('Failed to fetch trust level:', error);
    }
  }

  async function fetchSessions() {
    try {
      isLoading.value = true;
      const client = await getRequestClient();
      const response =
        await client.get<SecuritySession[]>('/zero-trust/sessions');
      sessions.value = response;
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function terminateSession(sessionId: string) {
    try {
      const client = await getRequestClient();
      await client.delete(`/zero-trust/sessions/${sessionId}`);
      sessions.value = sessions.value.filter((s) => s.sessionId !== sessionId);
      return true;
    } catch (error) {
      console.error('Failed to terminate session:', error);
      return false;
    }
  }

  async function terminateAllOtherSessions() {
    try {
      const client = await getRequestClient();
      await client.post('/zero-trust/sessions/terminate-all');
      sessions.value = sessions.value.filter((s) => s.isCurrentSession);
      return true;
    } catch (error) {
      console.error('Failed to terminate sessions:', error);
      return false;
    }
  }

  async function fetchDevices() {
    try {
      isLoading.value = true;
      const client = await getRequestClient();
      const response =
        await client.get<KnownDevice[]>('/zero-trust/devices');
      devices.value = response;
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function trustDevice(deviceId: number) {
    try {
      const client = await getRequestClient();
      await client.post(`/zero-trust/devices/${deviceId}/trust`);
      const device = devices.value.find((d) => d.id === deviceId);
      if (device) {
        device.isTrusted = true;
        device.isBlocked = false;
      }
      return true;
    } catch (error) {
      console.error('Failed to trust device:', error);
      return false;
    }
  }

  async function blockDevice(deviceId: number) {
    try {
      const client = await getRequestClient();
      await client.post(`/zero-trust/devices/${deviceId}/block`);
      const device = devices.value.find((d) => d.id === deviceId);
      if (device) {
        device.isBlocked = true;
        device.isTrusted = false;
      }
      return true;
    } catch (error) {
      console.error('Failed to block device:', error);
      return false;
    }
  }

  async function deleteDevice(deviceId: number) {
    try {
      const client = await getRequestClient();
      await client.delete(`/zero-trust/devices/${deviceId}`);
      devices.value = devices.value.filter((d) => d.id !== deviceId);
      return true;
    } catch (error) {
      console.error('Failed to delete device:', error);
      return false;
    }
  }

  async function fetchRecentEvents(limit: number = 20) {
    try {
      isLoading.value = true;
      const client = await getRequestClient();
      const response = await client.get<SecurityEvent[]>(
        '/zero-trust/events',
        { params: { limit } },
      );
      recentEvents.value = response;
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      isLoading.value = false;
    }
  }

  function setStepUpRequired(
    required: boolean,
    reason?: string,
    method?: string,
    sessionId?: string,
  ) {
    stepUp.value = {
      required,
      reason: reason || null,
      method: method || null,
      sessionId: sessionId || null,
    };
  }

  async function completeStepUp(code: string, method: string = 'mfa') {
    try {
      const client = await getRequestClient();
      const response = await client.post<{
        success: boolean;
        trustLevel: string;
        trustScore: number;
      }>('/zero-trust/step-up', {
        code,
        method,
        sessionId: stepUp.value.sessionId,
      });

      if (response.success) {
        stepUp.value = {
          required: false,
          reason: null,
          method: null,
          sessionId: null,
        };

        trustLevel.value = {
          ...trustLevel.value,
          level: response.trustLevel as TrustLevel['level'],
          score: response.trustScore,
        };

        return true;
      }

      return false;
    } catch (error) {
      console.error('Step-up authentication failed:', error);
      return false;
    }
  }

  function updateTrustFromHeaders(headers: Headers) {
    const level = headers.get('X-Trust-Level');
    const score = headers.get('X-Trust-Score');
    const risk = headers.get('X-Risk-Score');
    const stepUpRequired = headers.get('X-Step-Up-Recommended');

    if (level) {
      trustLevel.value.level = level as TrustLevel['level'];
    }
    if (score) {
      trustLevel.value.score = parseInt(score, 10);
    }
    if (risk) {
      trustLevel.value.riskScore = parseInt(risk, 10);
    }
    if (stepUpRequired === 'true') {
      stepUp.value.required = true;
    }
  }

  function getDeviceFingerprint(): string | null {
    return deviceFingerprint.value || getFingerprintHeader();
  }

  function reset() {
    trustLevel.value = { level: 'low', score: 50, riskScore: 0 };
    stepUp.value = { required: false, reason: null, method: null, sessionId: null };
    sessions.value = [];
    devices.value = [];
    recentEvents.value = [];
    isInitialized.value = false;
  }

  return {
    // State
    trustLevel,
    stepUp,
    sessions,
    devices,
    recentEvents,
    deviceFingerprint,
    isInitialized,
    isLoading,

    // Computed
    currentTrustLevel,
    trustScore,
    riskScore,
    isHighRisk,
    requiresStepUp,
    activeSessions,
    currentSession,
    trustedDevices,
    currentDevice,

    // Actions
    initialize,
    fetchTrustLevel,
    fetchSessions,
    terminateSession,
    terminateAllOtherSessions,
    fetchDevices,
    trustDevice,
    blockDevice,
    deleteDevice,
    fetchRecentEvents,
    setStepUpRequired,
    completeStepUp,
    updateTrustFromHeaders,
    getDeviceFingerprint,
    reset,
  };
});
