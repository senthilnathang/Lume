<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

export interface CalendarEvent {
  id: string | number;
  title: string;
  start: Date | string;
  end?: Date | string;
  allDay?: boolean;
  color?: string;
  description?: string;
  [key: string]: any;
}

interface Props {
  events: CalendarEvent[];
  initialDate?: Date | string;
  view?: 'month' | 'week' | 'day';
  loading?: boolean;
  eventColors?: Record<string, string>;
  showHeader?: boolean;
  showNavigation?: boolean;
  showViewToggle?: boolean;
  minHeight?: string;
}

const props = withDefaults(defineProps<Props>(), {
  initialDate: () => new Date(),
  view: 'month',
  loading: false,
  eventColors: () => ({}),
  showHeader: true,
  showNavigation: true,
  showViewToggle: true,
  minHeight: '500px',
});

const emit = defineEmits<{
  (e: 'event-click', event: CalendarEvent): void;
  (e: 'date-click', date: Date): void;
  (e: 'view-change', view: 'month' | 'week' | 'day'): void;
  (e: 'date-change', date: Date): void;
}>();

defineSlots<{
  event?: (props: { event: CalendarEvent }) => any;
  'day-content'?: (props: { date: Date; events: CalendarEvent[] }) => any;
}>();

const currentDate = ref(new Date(props.initialDate));
const currentView = ref(props.view);

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const currentMonthYear = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
});

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean }> = [];

  // Add days from previous month
  const startPadding = firstDay.getDay();
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date()),
    });
  }

  // Add days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, new Date()),
    });
  }

  // Add days from next month
  const endPadding = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i);
    days.push({
      date,
      isCurrentMonth: false,
      isToday: isSameDay(date, new Date()),
    });
  }

  return days;
});

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function getEventsForDate(date: Date): CalendarEvent[] {
  return props.events.filter((event) => {
    const eventStart = new Date(event.start);
    const eventEnd = event.end ? new Date(event.end) : eventStart;

    // Reset time for comparison
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
}

function getEventColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  if (event.type && props.eventColors[event.type]) {
    return props.eventColors[event.type]!;
  }
  return '#1890ff';
}

function navigatePrevious() {
  const newDate = new Date(currentDate.value);
  if (currentView.value === 'month') {
    newDate.setMonth(newDate.getMonth() - 1);
  } else if (currentView.value === 'week') {
    newDate.setDate(newDate.getDate() - 7);
  } else {
    newDate.setDate(newDate.getDate() - 1);
  }
  currentDate.value = newDate;
  emit('date-change', newDate);
}

function navigateNext() {
  const newDate = new Date(currentDate.value);
  if (currentView.value === 'month') {
    newDate.setMonth(newDate.getMonth() + 1);
  } else if (currentView.value === 'week') {
    newDate.setDate(newDate.getDate() + 7);
  } else {
    newDate.setDate(newDate.getDate() + 1);
  }
  currentDate.value = newDate;
  emit('date-change', newDate);
}

function goToToday() {
  currentDate.value = new Date();
  emit('date-change', currentDate.value);
}

function setView(view: 'month' | 'week' | 'day') {
  currentView.value = view;
  emit('view-change', view);
}

function handleDateClick(date: Date) {
  emit('date-click', date);
}

function handleEventClick(event: CalendarEvent, e: Event) {
  e.stopPropagation();
  emit('event-click', event);
}

watch(
  () => props.initialDate,
  (newDate) => {
    currentDate.value = new Date(newDate);
  },
);

watch(
  () => props.view,
  (newView) => {
    currentView.value = newView;
  },
);
</script>

<template>
  <div class="event-calendar" :style="{ minHeight }">
    <!-- Header -->
    <div v-if="showHeader" class="calendar-header">
      <div class="calendar-nav" v-if="showNavigation">
        <button class="nav-btn" @click="navigatePrevious">&lt;</button>
        <button class="nav-btn today-btn" @click="goToToday">Today</button>
        <button class="nav-btn" @click="navigateNext">&gt;</button>
      </div>

      <h2 class="calendar-title">{{ currentMonthYear }}</h2>

      <div v-if="showViewToggle" class="calendar-views">
        <button
          class="view-btn"
          :class="{ active: currentView === 'month' }"
          @click="setView('month')"
        >
          Month
        </button>
        <button
          class="view-btn"
          :class="{ active: currentView === 'week' }"
          @click="setView('week')"
        >
          Week
        </button>
        <button
          class="view-btn"
          :class="{ active: currentView === 'day' }"
          @click="setView('day')"
        >
          Day
        </button>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="loading" class="calendar-loading">
      <div class="calendar-spinner"></div>
    </div>

    <!-- Month View -->
    <div v-if="currentView === 'month'" class="calendar-grid">
      <!-- Week day headers -->
      <div class="calendar-weekdays">
        <div v-for="day in weekDays" :key="day" class="weekday">
          {{ day }}
        </div>
      </div>

      <!-- Calendar days -->
      <div class="calendar-days">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{
            'other-month': !day.isCurrentMonth,
            'is-today': day.isToday,
          }"
          @click="handleDateClick(day.date)"
        >
          <div class="day-number">{{ day.date.getDate() }}</div>

          <slot name="day-content" :date="day.date" :events="getEventsForDate(day.date)">
            <div class="day-events">
              <div
                v-for="event in getEventsForDate(day.date).slice(0, 3)"
                :key="event.id"
                class="event-item"
                :style="{ backgroundColor: getEventColor(event) }"
                :title="event.title"
                @click="handleEventClick(event, $event)"
              >
                <slot name="event" :event="event">
                  <span class="event-title">{{ event.title }}</span>
                </slot>
              </div>
              <div
                v-if="getEventsForDate(day.date).length > 3"
                class="more-events"
              >
                +{{ getEventsForDate(day.date).length - 3 }} more
              </div>
            </div>
          </slot>
        </div>
      </div>
    </div>

    <!-- Week/Day views would go here -->
    <div v-else class="calendar-view-placeholder">
      <p>{{ currentView }} view coming soon</p>
    </div>
  </div>
</template>

<style scoped>
.event-calendar {
  position: relative;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
}

.calendar-nav {
  display: flex;
  gap: 8px;
}

.nav-btn {
  padding: 6px 12px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.nav-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.today-btn {
  padding: 6px 16px;
}

.calendar-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.calendar-views {
  display: flex;
  gap: 4px;
}

.view-btn {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.view-btn:first-child {
  border-radius: 4px 0 0 4px;
}

.view-btn:last-child {
  border-radius: 0 4px 4px 0;
}

.view-btn.active {
  background-color: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.calendar-loading {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.calendar-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.calendar-grid {
  padding: 0;
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid #e8e8e8;
}

.weekday {
  padding: 12px 8px;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #666;
  background-color: #fafafa;
}

.calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  min-height: 100px;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.calendar-day:nth-child(7n) {
  border-right: none;
}

.calendar-day:hover {
  background-color: #f5f5f5;
}

.calendar-day.other-month {
  background-color: #fafafa;
}

.calendar-day.other-month .day-number {
  color: #bbb;
}

.calendar-day.is-today {
  background-color: #e6f7ff;
}

.calendar-day.is-today .day-number {
  background-color: #1890ff;
  color: #fff;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.event-item {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transition: opacity 0.2s;
}

.event-item:hover {
  opacity: 0.8;
}

.event-title {
  font-weight: 500;
}

.more-events {
  font-size: 11px;
  color: #1890ff;
  cursor: pointer;
  padding: 2px 0;
}

.calendar-view-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: #999;
}

/* Dark mode */
.dark .event-calendar {
  background-color: #1f1f1f;
}

.dark .calendar-header {
  border-bottom-color: #333;
}

.dark .calendar-title {
  color: #fff;
}

.dark .nav-btn,
.dark .view-btn {
  background-color: #2d2d2d;
  border-color: #333;
  color: #fff;
}

.dark .nav-btn:hover,
.dark .view-btn:hover {
  border-color: #1890ff;
}

.dark .view-btn.active {
  background-color: #1890ff;
}

.dark .weekday {
  background-color: #2d2d2d;
  color: #aaa;
}

.dark .calendar-weekdays,
.dark .calendar-day {
  border-color: #333;
}

.dark .calendar-day:hover {
  background-color: #2d2d2d;
}

.dark .calendar-day.other-month {
  background-color: #262626;
}

.dark .calendar-day.is-today {
  background-color: #111d2c;
}

.dark .day-number {
  color: #fff;
}
</style>
