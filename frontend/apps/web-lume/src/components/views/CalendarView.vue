<template>
  <div class="calendar-view">
    <div class="calendar-header">
      <button @click="previousMonth">←</button>
      <h2>{{ monthYear }}</h2>
      <button @click="nextMonth">→</button>
    </div>
    <div class="calendar-weekdays">
      <div v-for="day in weekdays" :key="day" class="weekday">{{ day }}</div>
    </div>
    <div class="calendar-grid">
      <div
        v-for="day in calendarDays"
        :key="day.date"
        :class="['calendar-day', { 'other-month': !day.currentMonth, 'has-events': day.events.length > 0 }]"
      >
        <div class="day-number">{{ day.dayOfMonth }}</div>
        <div v-for="event in day.events" :key="event.id" class="calendar-event" @click="selectEvent(event)">
          {{ event.title }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  viewDefinition: any;
  entityId: number;
}>();

const emit = defineEmits<{
  'record-selected': [record: any];
}>();

const currentDate = ref(new Date(2026, 3, 1));

const monthYear = computed(() => {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
  return currentDate.value.toLocaleDateString('en-US', options);
});

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const events = ref([
  { id: 1, title: 'Event 1', date: '2026-04-05' },
  { id: 2, title: 'Event 2', date: '2026-04-15' },
  { id: 3, title: 'Event 3', date: '2026-04-20' },
]);

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days = [];
  const current = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    const dateStr = current.toISOString().split('T')[0];
    const dayEvents = events.value.filter(e => e.date === dateStr);

    days.push({
      date: dateStr,
      dayOfMonth: current.getDate(),
      currentMonth: current.getMonth() === month,
      events: dayEvents,
    });

    current.setDate(current.getDate() + 1);
  }

  return days;
});

const previousMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1);
};

const nextMonth = () => {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1);
};

const selectEvent = (event: any) => {
  emit('record-selected', event);
};
</script>

<style scoped>
.calendar-view {
  padding: 20px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.calendar-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.calendar-header button {
  padding: 8px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.calendar-header button:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.weekday {
  text-align: center;
  font-weight: 600;
  color: #666;
  font-size: 12px;
  padding: 10px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.calendar-day {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px;
  min-height: 100px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.calendar-day:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.calendar-day.other-month {
  background-color: #f5f5f5;
  opacity: 0.6;
}

.calendar-day.has-events {
  background: linear-gradient(135deg, #f5f7fa 0%, #e3f2fd 100%);
}

.day-number {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  font-size: 12px;
}

.calendar-event {
  background: #1890ff;
  color: white;
  padding: 2px 6px;
  border-radius: 2px;
  font-size: 11px;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
