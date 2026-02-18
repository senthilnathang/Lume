<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  rating?: number;
  scale?: number;
  icon?: string;
  size?: number;
  color?: string;
  title?: string;
}>(), {
  rating: 4.5,
  scale: 5,
  icon: 'star',
  size: 24,
  color: '#f59e0b',
  title: '',
});

const stars = computed(() => {
  const result = [];
  for (let i = 1; i <= props.scale; i++) {
    if (i <= Math.floor(props.rating)) result.push('full');
    else if (i - 0.5 <= props.rating) result.push('half');
    else result.push('empty');
  }
  return result;
});

const starViewBox = '0 0 24 24';
const starPath = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';
</script>

<template>
  <div class="lume-star-rating">
    <div v-if="title" class="lume-star-rating-title">{{ title }}</div>
    <div class="lume-star-rating-stars" :aria-label="`Rating: ${rating} out of ${scale}`">
      <svg
        v-for="(type, i) in stars"
        :key="i"
        :width="size"
        :height="size"
        :viewBox="starViewBox"
        class="lume-star"
        :class="`lume-star--${type}`"
      >
        <defs v-if="type === 'half'">
          <linearGradient :id="`half-${i}`">
            <stop offset="50%" :stop-color="color" />
            <stop offset="50%" stop-color="transparent" />
          </linearGradient>
        </defs>
        <path
          :d="starPath"
          :fill="type === 'full' ? color : type === 'half' ? `url(#half-${i})` : 'none'"
          :stroke="color"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>

<style scoped>
.lume-star-rating {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.lume-star-rating-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}
.lume-star-rating-stars {
  display: flex;
  gap: 2px;
}
.lume-star {
  display: block;
}
.lume-star--empty { opacity: 0.3; }
</style>
