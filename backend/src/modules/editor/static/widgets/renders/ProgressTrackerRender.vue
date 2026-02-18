<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  height?: number;
  color?: string;
  backgroundColor?: string;
  position?: string;
  style?: string;
}>(), {
  height: 4,
  color: '#1677ff',
  backgroundColor: '#e5e7eb',
  position: 'top',
  style: 'bar',
});

const progress = ref(0);

function updateProgress() {
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
  const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  progress.value = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
}

onMounted(() => {
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
});

onUnmounted(() => {
  window.removeEventListener('scroll', updateProgress);
});

const barBackground = props.style === 'gradient'
  ? `linear-gradient(90deg, ${props.color}, #8b5cf6)`
  : props.color;
</script>

<template>
  <div
    class="lume-progress-tracker"
    :class="`lume-progress-tracker--${position}`"
    :style="{ height: height + 'px', backgroundColor }"
  >
    <div
      class="lume-progress-tracker-fill"
      :style="{ width: progress + '%', background: barBackground, height: '100%' }"
    ></div>
  </div>
</template>

<style scoped>
.lume-progress-tracker {
  position: fixed;
  left: 0;
  right: 0;
  z-index: 9999;
  overflow: hidden;
}
.lume-progress-tracker--top { top: 0; }
.lume-progress-tracker--bottom { bottom: 0; }
.lume-progress-tracker-fill {
  transition: width 0.1s linear;
}
</style>
