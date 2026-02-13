import { defineStore } from 'pinia';

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

interface TrustState {
  trustLevel: TrustLevel;
  stepUp: StepUpState;
  sessions: SecuritySession[];
  devices: KnownDevice[];
  recentEvents: SecurityEvent[];
  isInitialized: boolean;
  isLoading: boolean;
}

export const useTrustStore = defineStore('trust', {
  state: (): TrustState => ({
    trustLevel: { level: 'low', score: 50, riskScore: 0 },
    stepUp: { required: false, reason: null, method: null, sessionId: null },
    sessions: [],
    devices: [],
    recentEvents: [],
    isInitialized: false,
    isLoading: false,
  }),

  getters: {
    currentTrustLevel: (state) => state.trustLevel.level,
    trustScore: (state) => state.trustLevel.score,
    riskScore: (state) => state.trustLevel.riskScore,
    isHighRisk: (state) => state.trustLevel.riskScore > 50,
    requiresStepUp: (state) => state.stepUp.required,
    activeSessions: (state) => state.sessions.filter((s) => !s.isCurrentSession),
    currentSession: (state) => state.sessions.find((s) => s.isCurrentSession),
    trustedDevices: (state) => state.devices.filter((d) => d.isTrusted),
    currentDevice: (state) => state.devices.find((d) => d.isCurrentDevice),
  },

  actions: {
    async initialize() {
      if (this.isInitialized) return;
      try {
        await this.fetchTrustLevel();
        this.isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize trust store:', error);
      }
    },

    async fetchTrustLevel() {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;
        const data = await $fetch<{
          data: { trust_level: string; trust_score: number; risk_score: number };
        }>('/api/v1/zero-trust/trust-level', {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.trustLevel = {
          level: data.data.trust_level as TrustLevel['level'],
          score: data.data.trust_score,
          riskScore: data.data.risk_score,
        };
      } catch (error) {
        console.error('Failed to fetch trust level:', error);
      }
    },

    async fetchSessions() {
      this.isLoading = true;
      try {
        const token = localStorage.getItem('access_token');
        const data = await $fetch<{ data: SecuritySession[] }>('/api/v1/zero-trust/sessions', {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.sessions = data.data;
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async terminateSession(sessionId: string) {
      try {
        const token = localStorage.getItem('access_token');
        await $fetch(`/api/v1/zero-trust/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        this.sessions = this.sessions.filter((s) => s.sessionId !== sessionId);
        return true;
      } catch {
        return false;
      }
    },

    async fetchDevices() {
      this.isLoading = true;
      try {
        const token = localStorage.getItem('access_token');
        const data = await $fetch<{ data: KnownDevice[] }>('/api/v1/zero-trust/devices', {
          headers: { Authorization: `Bearer ${token}` },
        });
        this.devices = data.data;
      } catch (error) {
        console.error('Failed to fetch devices:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async trustDevice(deviceId: number) {
      try {
        const token = localStorage.getItem('access_token');
        await $fetch(`/api/v1/zero-trust/devices/${deviceId}/trust`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const device = this.devices.find((d) => d.id === deviceId);
        if (device) { device.isTrusted = true; device.isBlocked = false; }
        return true;
      } catch {
        return false;
      }
    },

    async blockDevice(deviceId: number) {
      try {
        const token = localStorage.getItem('access_token');
        await $fetch(`/api/v1/zero-trust/devices/${deviceId}/block`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const device = this.devices.find((d) => d.id === deviceId);
        if (device) { device.isBlocked = true; device.isTrusted = false; }
        return true;
      } catch {
        return false;
      }
    },

    async fetchRecentEvents(limit: number = 20) {
      this.isLoading = true;
      try {
        const token = localStorage.getItem('access_token');
        const data = await $fetch<{ data: SecurityEvent[] }>('/api/v1/zero-trust/events', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit },
        });
        this.recentEvents = data.data;
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        this.isLoading = false;
      }
    },

    setStepUpRequired(required: boolean, reason?: string, method?: string, sessionId?: string) {
      this.stepUp = {
        required,
        reason: reason || null,
        method: method || null,
        sessionId: sessionId || null,
      };
    },

    updateTrustFromHeaders(headers: Headers) {
      const level = headers.get('X-Trust-Level');
      const score = headers.get('X-Trust-Score');
      const risk = headers.get('X-Risk-Score');
      if (level) this.trustLevel.level = level as TrustLevel['level'];
      if (score) this.trustLevel.score = parseInt(score, 10);
      if (risk) this.trustLevel.riskScore = parseInt(risk, 10);
      if (headers.get('X-Step-Up-Recommended') === 'true') {
        this.stepUp.required = true;
      }
    },

    $reset() {
      this.trustLevel = { level: 'low', score: 50, riskScore: 0 };
      this.stepUp = { required: false, reason: null, method: null, sessionId: null };
      this.sessions = [];
      this.devices = [];
      this.recentEvents = [];
      this.isInitialized = false;
    },
  },
});
