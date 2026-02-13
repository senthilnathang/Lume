<script setup lang="ts">
import { useTrustStore } from '~/stores/trust';

definePageMeta({ middleware: 'auth' });

const trustStore = useTrustStore();

onMounted(async () => {
  await trustStore.initialize();
  await Promise.all([
    trustStore.fetchSessions(),
    trustStore.fetchDevices(),
    trustStore.fetchRecentEvents(),
  ]);
});

function trustLevelColor(level: string) {
  const map: Record<string, string> = {
    critical: 'text-green-600 bg-green-50',
    high: 'text-blue-600 bg-blue-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-orange-600 bg-orange-50',
    none: 'text-red-600 bg-red-50',
  };
  return map[level] || 'text-gray-600 bg-gray-50';
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-heading font-bold text-gray-900">Security Dashboard</h1>

    <!-- Trust Level -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Trust Level</h3>
        <div class="flex items-center gap-3">
          <span class="text-3xl font-bold capitalize px-3 py-1 rounded-lg"
            :class="trustLevelColor(trustStore.currentTrustLevel)">
            {{ trustStore.currentTrustLevel }}
          </span>
        </div>
        <p class="text-sm text-gray-500 mt-2">Score: {{ trustStore.trustScore }} / 100</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Risk Score</h3>
        <p class="text-3xl font-bold" :class="trustStore.isHighRisk ? 'text-red-600' : 'text-green-600'">
          {{ trustStore.riskScore }}
        </p>
        <p class="text-sm text-gray-500 mt-2">{{ trustStore.isHighRisk ? 'High Risk' : 'Normal' }}</p>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 class="text-sm font-medium text-gray-500 mb-2">Active Sessions</h3>
        <p class="text-3xl font-bold text-gray-900">{{ trustStore.sessions.length }}</p>
        <p class="text-sm text-gray-500 mt-2">{{ trustStore.activeSessions.length }} other sessions</p>
      </div>
    </div>

    <!-- Devices -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Known Devices</h2>
      <div v-if="trustStore.isLoading" class="text-center text-gray-500 py-4">Loading...</div>
      <div v-else-if="trustStore.devices.length === 0" class="text-center text-gray-500 py-4">
        No devices registered
      </div>
      <div v-else class="space-y-3">
        <div v-for="device in trustStore.devices" :key="device.id"
          class="flex items-center justify-between p-4 rounded-lg border border-gray-100"
          :class="device.isCurrentDevice ? 'bg-primary-50 border-primary-200' : ''">
          <div>
            <p class="text-sm font-medium text-gray-900">
              {{ device.deviceName }}
              <span v-if="device.isCurrentDevice" class="ml-2 text-xs text-primary-600">(Current)</span>
            </p>
            <p class="text-xs text-gray-500">{{ device.deviceType }} &middot; Last seen {{ device.lastSeenAt }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs rounded-full"
              :class="device.isTrusted ? 'bg-green-100 text-green-700' :
                       device.isBlocked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'">
              {{ device.isTrusted ? 'Trusted' : device.isBlocked ? 'Blocked' : 'Unknown' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Events -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Security Events</h2>
      <div v-if="trustStore.recentEvents.length === 0" class="text-center text-gray-500 py-4">
        No recent events
      </div>
      <div v-else class="space-y-2">
        <div v-for="event in trustStore.recentEvents" :key="event.id"
          class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
          <div>
            <p class="text-sm font-medium text-gray-900">{{ event.eventType }}</p>
            <p class="text-xs text-gray-500">{{ event.ipAddress }} &middot; {{ event.createdAt }}</p>
          </div>
          <span class="text-xs text-gray-500">Impact: {{ event.riskImpact }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
