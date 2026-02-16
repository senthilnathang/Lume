<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  targetDate?: string;
  showLabels?: boolean;
  displayStyle?: string;
  expiredMessage?: string;
}>(), {
  targetDate: '',
  showLabels: true,
  displayStyle: 'simple',
  expiredMessage: 'Event has ended',
});

const now = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

const timeLeft = computed(() => {
  if (!props.targetDate) return null;
  const diff = new Date(props.targetDate).getTime() - now.value;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
});

const isExpired = computed(() => {
  if (!props.targetDate) return false;
  return new Date(props.targetDate).getTime() <= now.value;
});

const pad = (n: number) => String(n).padStart(2, '0');

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div v-if="isExpired" style="text-align: center; padding: 24px; font-size: 1.125rem; color: var(--lume-text-secondary);">
    {{ expiredMessage }}
  </div>
  <div v-else-if="!targetDate" style="text-align: center; padding: 24px; color: var(--lume-text-muted);">
    No target date set
  </div>
  <div v-else :class="['lume-countdown', `lume-countdown--${displayStyle}`]">
    <div class="lume-countdown-unit">
      <span class="lume-countdown-value">{{ pad(timeLeft!.days) }}</span>
      <span v-if="showLabels" class="lume-countdown-label">Days</span>
    </div>
    <div class="lume-countdown-unit">
      <span class="lume-countdown-value">{{ pad(timeLeft!.hours) }}</span>
      <span v-if="showLabels" class="lume-countdown-label">Hours</span>
    </div>
    <div class="lume-countdown-unit">
      <span class="lume-countdown-value">{{ pad(timeLeft!.minutes) }}</span>
      <span v-if="showLabels" class="lume-countdown-label">Minutes</span>
    </div>
    <div class="lume-countdown-unit">
      <span class="lume-countdown-value">{{ pad(timeLeft!.seconds) }}</span>
      <span v-if="showLabels" class="lume-countdown-label">Seconds</span>
    </div>
  </div>
</template>
