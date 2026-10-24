<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface ProgressItem {
  label: string;
  percentage: number;
  color?: string;
}

const props = withDefaults(defineProps<{
  items?: ProgressItem[];
  displayStyle?: string;
  animated?: boolean;
  showPercentage?: boolean;
}>(), {
  items: () => [
    { label: 'HTML/CSS', percentage: 90, color: '#1677ff' },
    { label: 'JavaScript', percentage: 75, color: '#22c55e' },
    { label: 'Vue.js', percentage: 85, color: '#7c3aed' },
  ],
  displayStyle: 'bar',
  animated: true,
  showPercentage: true,
});

const circleRadius = 45;
const circleCircumference = 2 * Math.PI * circleRadius;

const strokeDashoffset = (percentage: number) =>
  circleCircumference - (percentage / 100) * circleCircumference;

const fillClasses = computed(() => {
  const classes = ['lume-progress-bar-fill'];
  if (props.animated) {
    classes.push('lume-progress-bar-fill--striped');
    classes.push('lume-progress-bar-fill--animated');
  }
  return classes;
});
</script>

<template>
  <div>
    <!-- Bar style -->
    <template v-if="displayStyle === 'bar'">
      <div
        v-for="(item, index) in items"
        :key="index"
        class="lume-progress-bar"
        :style="{ marginBottom: index < items.length - 1 ? '16px' : '0' }"
      >
        <div class="lume-progress-bar-header">
          <span class="lume-progress-bar-label">{{ item.label }}</span>
          <span v-if="showPercentage" class="lume-progress-bar-value">{{ item.percentage }}%</span>
        </div>
        <div class="lume-progress-bar-track">
          <div
            :class="fillClasses"
            :style="{
              width: item.percentage + '%',
              backgroundColor: item.color || 'var(--lume-primary)',
            }"
          />
        </div>
      </div>
    </template>

    <!-- Circle style -->
    <template v-else-if="displayStyle === 'circle'">
      <div style="display: flex; flex-wrap: wrap; gap: 32px; justify-content: center;">
        <div
          v-for="(item, index) in items"
          :key="index"
          style="text-align: center;"
        >
          <div class="lume-progress-bar--circle">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                class="lume-progress-bar-circle-bg"
                cx="60"
                cy="60"
                :r="circleRadius"
                stroke-width="8"
              />
              <circle
                class="lume-progress-bar-circle-fill"
                cx="60"
                cy="60"
                :r="circleRadius"
                stroke-width="8"
                :stroke="item.color || 'var(--lume-primary)'"
                :stroke-dasharray="circleCircumference"
                :stroke-dashoffset="strokeDashoffset(item.percentage)"
              />
            </svg>
            <span v-if="showPercentage" class="lume-progress-bar-circle-text">
              {{ item.percentage }}%
            </span>
          </div>
          <div
            style="margin-top: 8px; font-size: 0.875rem; font-weight: 500; color: var(--lume-text);"
          >
            {{ item.label }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
