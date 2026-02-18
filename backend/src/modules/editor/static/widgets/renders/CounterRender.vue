<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  startValue?: number;
  endValue?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  separator?: boolean;
  tag?: string;
  color?: string;
}>(), {
  startValue: 0,
  endValue: 100,
  prefix: '',
  suffix: '',
  duration: 2000,
  separator: true,
  tag: 'h2',
  color: '#1677ff',
});

const currentValue = ref(props.startValue);
const counterEl = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;
let animationFrame: number | null = null;

const formattedValue = computed(() => {
  const val = Math.round(currentValue.value);
  const formatted = props.separator ? val.toLocaleString() : String(val);
  return `${props.prefix}${formatted}${props.suffix}`;
});

function animateCounter() {
  const start = Number(props.startValue);
  const end = Number(props.endValue);
  const dur = Number(props.duration);
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / dur, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    currentValue.value = start + (end - start) * eased;
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step);
    }
  }
  animationFrame = requestAnimationFrame(step);
}

onMounted(() => {
  if (counterEl.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animateCounter();
          observer?.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(counterEl.value);
  }
});

onUnmounted(() => {
  observer?.disconnect();
  if (animationFrame) cancelAnimationFrame(animationFrame);
});
</script>

<template>
  <div class="lume-counter" ref="counterEl">
    <component :is="tag" class="lume-counter-value" :style="{ color }">
      {{ formattedValue }}
    </component>
  </div>
</template>

<style scoped>
.lume-counter {
  text-align: center;
  padding: 16px 0;
}
.lume-counter-value {
  margin: 0;
  font-weight: 700;
  line-height: 1.2;
}
</style>
