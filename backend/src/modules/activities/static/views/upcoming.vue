<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { Clock, RefreshCw, MapPin, Users, Calendar, Star } from 'lucide-vue-next';
import { getUpcomingActivities, type Activity } from '@modules/activities/static/api/index';

defineOptions({ name: 'UpcomingActivitiesView' });

const loading = ref(false);
const activities = ref<Activity[]>([]);

async function loadUpcoming() {
  loading.value = true;
  try {
    const res = await getUpcomingActivities(50);
    activities.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { activities.value = []; }
  finally { loading.value = false; }
}

function daysUntil(dateStr?: string): string {
  if (!dateStr) return '';
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `In ${days} days`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const urgencyColor = (dateStr?: string): string => {
  if (!dateStr) return 'default';
  const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (days <= 1) return 'red';
  if (days <= 7) return 'orange';
  if (days <= 30) return 'blue';
  return 'green';
};

const categoryColors: Record<string, string> = {
  event: 'blue', workshop: 'purple', meeting: 'cyan',
  fundraiser: 'green', volunteer: 'orange', social: 'magenta',
};

onMounted(() => { loadUpcoming(); });
</script>

<template>
  <div class="upcoming-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Clock :size="24" /> Upcoming Activities</h1>
        <p class="text-gray-500 m-0">Activities scheduled for the future, sorted by date</p>
      </div>
      <a-button @click="loadUpcoming" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div v-if="activities.length" class="space-y-3">
        <a-card v-for="activity in activities" :key="activity.id" size="small" hoverable>
          <div class="flex items-start gap-4">
            <!-- Date Badge -->
            <div class="flex-shrink-0 w-16 text-center">
              <div class="bg-blue-50 rounded-lg p-2">
                <div class="text-xs text-blue-400 uppercase">{{ activity.start_date ? new Date(activity.start_date).toLocaleDateString('en-US', { month: 'short' }) : '-' }}</div>
                <div class="text-2xl font-bold text-blue-600">{{ activity.start_date ? new Date(activity.start_date).getDate() : '-' }}</div>
                <div class="text-xs text-blue-400">{{ formatTime(activity.start_date) }}</div>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-base">{{ activity.title }}</span>
                <Star v-if="activity.is_featured" :size="14" class="text-yellow-500 flex-shrink-0" />
              </div>

              <div class="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-2">
                <span v-if="activity.category">
                  <a-tag :color="categoryColors[activity.category] || 'default'" size="small">{{ activity.category }}</a-tag>
                </span>
                <span v-if="activity.location" class="flex items-center gap-1"><MapPin :size="12" /> {{ activity.location }}</span>
                <span v-if="activity.capacity" class="flex items-center gap-1"><Users :size="12" /> {{ activity.registered_count || 0 }}/{{ activity.capacity }}</span>
                <span class="flex items-center gap-1"><Calendar :size="12" /> {{ formatDate(activity.start_date) }}</span>
              </div>

              <p v-if="activity.short_description" class="text-sm text-gray-500 m-0 line-clamp-2">{{ activity.short_description }}</p>
            </div>

            <!-- Countdown -->
            <div class="flex-shrink-0">
              <a-tag :color="urgencyColor(activity.start_date)">{{ daysUntil(activity.start_date) }}</a-tag>
            </div>
          </div>
        </a-card>
      </div>

      <a-empty v-else-if="!loading" description="No upcoming activities scheduled" />
    </a-spin>
  </div>
</template>

<style scoped>
.upcoming-page { min-height: 100%; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
