<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { CalendarDays, RefreshCw, ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-vue-next';
import dayjs, { type Dayjs } from 'dayjs';
import { getActivities, type Activity } from '@/api/activities';

defineOptions({ name: 'ActivitiesCalendarView' });

const loading = ref(false);
const activities = ref<Activity[]>([]);
const currentMonth = ref(dayjs());
const selectedDate = ref<Dayjs | null>(null);

async function loadActivities() {
  loading.value = true;
  try {
    const res = await getActivities({ limit: 500, status: 'published' });
    const data = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.items || [];
    activities.value = data;
  } catch { activities.value = []; }
  finally { loading.value = false; }
}

function getEventsForDate(date: Dayjs): Activity[] {
  const dateStr = date.format('YYYY-MM-DD');
  return activities.value.filter(a => {
    if (!a.start_date) return false;
    const start = dayjs(a.start_date).format('YYYY-MM-DD');
    const end = a.end_date ? dayjs(a.end_date).format('YYYY-MM-DD') : start;
    return dateStr >= start && dateStr <= end;
  });
}

const calendarDays = computed(() => {
  const start = currentMonth.value.startOf('month').startOf('week');
  const end = currentMonth.value.endOf('month').endOf('week');
  const days: Dayjs[] = [];
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    days.push(current);
    current = current.add(1, 'day');
  }
  return days;
});

const selectedDateEvents = computed(() => {
  if (!selectedDate.value) return [];
  return getEventsForDate(selectedDate.value);
});

function prevMonth() { currentMonth.value = currentMonth.value.subtract(1, 'month'); }
function nextMonth() { currentMonth.value = currentMonth.value.add(1, 'month'); }
function goToday() { currentMonth.value = dayjs(); selectedDate.value = dayjs(); }

const categoryColors: Record<string, string> = {
  event: '#1890ff', workshop: '#722ed1', meeting: '#13c2c2',
  fundraiser: '#52c41a', volunteer: '#fa8c16', social: '#eb2f96',
};

function eventColor(category?: string): string {
  return categoryColors[category || ''] || '#1890ff';
}

onMounted(() => { loadActivities(); });
</script>

<template>
  <div class="calendar-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><CalendarDays :size="24" /> Activity Calendar</h1>
        <p class="text-gray-500 m-0">View scheduled activities on the calendar</p>
      </div>
      <a-button @click="loadActivities" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>Refresh
      </a-button>
    </div>

    <a-row :gutter="16">
      <a-col :xs="24" :lg="16">
        <a-card size="small" :loading="loading">
          <!-- Month Navigation -->
          <div class="flex items-center justify-between mb-4">
            <a-button @click="prevMonth" size="small"><ChevronLeft :size="16" /></a-button>
            <div class="text-lg font-semibold">{{ currentMonth.format('MMMM YYYY') }}</div>
            <div class="flex gap-2">
              <a-button @click="goToday" size="small">Today</a-button>
              <a-button @click="nextMonth" size="small"><ChevronRight :size="16" /></a-button>
            </div>
          </div>

          <!-- Weekday Headers -->
          <div class="grid grid-cols-7 gap-0 mb-1">
            <div v-for="day in ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']" :key="day"
              class="text-center text-xs font-medium text-gray-400 py-2">{{ day }}</div>
          </div>

          <!-- Calendar Grid -->
          <div class="grid grid-cols-7 gap-0">
            <div
              v-for="day in calendarDays" :key="day.format('YYYY-MM-DD')"
              class="border border-gray-100 p-1 min-h-[80px] cursor-pointer transition-colors"
              :class="{
                'bg-white': day.month() === currentMonth.month(),
                'bg-gray-50': day.month() !== currentMonth.month(),
                'bg-blue-50 border-blue-200': selectedDate && day.isSame(selectedDate, 'day'),
                'hover:bg-blue-50': true,
              }"
              @click="selectedDate = day"
            >
              <div class="text-xs text-right mb-1"
                :class="{
                  'text-gray-300': day.month() !== currentMonth.month(),
                  'text-blue-600 font-bold': day.isSame(dayjs(), 'day'),
                  'text-gray-600': day.month() === currentMonth.month() && !day.isSame(dayjs(), 'day'),
                }">
                {{ day.date() }}
              </div>
              <div v-for="event in getEventsForDate(day).slice(0, 2)" :key="event.id"
                class="text-xs px-1 py-0.5 rounded mb-0.5 truncate text-white"
                :style="{ backgroundColor: eventColor(event.category) }">
                {{ event.title }}
              </div>
              <div v-if="getEventsForDate(day).length > 2" class="text-xs text-gray-400 pl-1">
                +{{ getEventsForDate(day).length - 2 }} more
              </div>
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- Selected Date Events -->
      <a-col :xs="24" :lg="8">
        <a-card :title="selectedDate ? selectedDate.format('dddd, MMMM D') : 'Select a date'" size="small">
          <div v-if="selectedDateEvents.length" class="space-y-3">
            <div v-for="event in selectedDateEvents" :key="event.id"
              class="p-3 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
              <div class="flex items-start gap-2">
                <div class="w-1 h-full rounded-full flex-shrink-0 mt-1" style="min-height: 16px"
                  :style="{ backgroundColor: eventColor(event.category) }" />
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm">{{ event.title }}</div>
                  <div v-if="event.category" class="mt-1">
                    <a-tag :color="categoryColors[event.category] || 'default'" size="small">{{ event.category }}</a-tag>
                  </div>
                  <div class="text-xs text-gray-400 mt-1 space-y-0.5">
                    <div v-if="event.start_date" class="flex items-center gap-1">
                      <Clock :size="10" /> {{ new Date(event.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }}
                      <template v-if="event.end_date"> - {{ new Date(event.end_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) }}</template>
                    </div>
                    <div v-if="event.location" class="flex items-center gap-1"><MapPin :size="10" /> {{ event.location }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else :description="selectedDate ? 'No activities on this date' : 'Click a date to view activities'" :image-style="{ height: '40px' }" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.calendar-page { min-height: 100%; }
</style>
