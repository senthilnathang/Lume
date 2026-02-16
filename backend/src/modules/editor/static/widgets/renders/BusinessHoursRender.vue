<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface DayHours {
  day: string;
  hours: string;
  closed?: boolean;
}

const props = withDefaults(defineProps<{
  title?: string;
  days?: DayHours[];
  highlightToday?: boolean;
  closedLabel?: string;
}>(), {
  title: 'Business Hours',
  days: () => [
    { day: 'Monday', hours: '9:00 AM - 5:00 PM' },
    { day: 'Tuesday', hours: '9:00 AM - 5:00 PM' },
    { day: 'Wednesday', hours: '9:00 AM - 5:00 PM' },
    { day: 'Thursday', hours: '9:00 AM - 5:00 PM' },
    { day: 'Friday', hours: '9:00 AM - 5:00 PM' },
    { day: 'Saturday', hours: '10:00 AM - 2:00 PM' },
    { day: 'Sunday', hours: '', closed: true },
  ],
  highlightToday: true,
  closedLabel: 'Closed',
});

const dayIndexMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const todayIndex = new Date().getDay();

const isToday = (dayName: string) => {
  if (!props.highlightToday) return false;
  return dayIndexMap[dayName.toLowerCase()] === todayIndex;
};
</script>

<template>
  <div>
    <h3
      v-if="title"
      style="font-size: 1.125rem; font-weight: 600; color: var(--lume-text); margin: 0 0 16px 0;"
    >
      {{ title }}
    </h3>
    <div class="lume-business-hours">
      <div
        v-for="(entry, index) in days"
        :key="index"
        :class="[
          'lume-hours-row',
          { 'lume-hours-row--today': isToday(entry.day) },
          { 'lume-hours-row--closed': entry.closed },
        ]"
      >
        <span class="lume-hours-day">{{ entry.day }}</span>
        <span class="lume-hours-time">
          {{ entry.closed ? closedLabel : entry.hours }}
        </span>
      </div>
    </div>
  </div>
</template>
