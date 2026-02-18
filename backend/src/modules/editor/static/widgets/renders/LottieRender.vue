<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  jsonUrl?: string;
  trigger?: string;
  loop?: boolean;
  speed?: number;
  width?: string;
  height?: string;
  autoplay?: boolean;
}>(), {
  jsonUrl: '',
  trigger: 'none',
  loop: true,
  speed: 1,
  width: '100%',
  height: '300px',
  autoplay: true,
});

const containerRef = ref<HTMLElement | null>(null);
const isLoaded = ref(false);
const hasError = ref(false);
const isVisible = ref(false);

let observer: IntersectionObserver | null = null;

onMounted(() => {
  if (!props.jsonUrl) return;

  // Viewport trigger
  if (props.trigger === 'viewport' || props.trigger === 'scroll') {
    if (containerRef.value) {
      observer = new IntersectionObserver(
        ([entry]) => { isVisible.value = entry.isIntersecting; },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.value);
    }
  }

  // Attempt to load lottie-web if available
  loadAnimation();
});

onUnmounted(() => {
  observer?.disconnect();
});

async function loadAnimation() {
  try {
    // Try dynamic import of lottie-web
    const lottie = await import('lottie-web').catch(() => null);
    if (lottie && containerRef.value) {
      const anim = lottie.default.loadAnimation({
        container: containerRef.value,
        renderer: 'svg',
        loop: props.loop,
        autoplay: props.autoplay && (props.trigger === 'none'),
        path: props.jsonUrl,
      });
      anim.setSpeed(props.speed);
      isLoaded.value = true;
    } else {
      // Fallback: just show a placeholder with CSS animation
      isLoaded.value = false;
    }
  } catch {
    hasError.value = true;
  }
}
</script>

<template>
  <div
    class="lume-lottie"
    ref="containerRef"
    :style="{ width, height }"
    :class="{
      'lume-lottie--hover': trigger === 'hover',
      'lume-lottie--visible': isVisible,
    }"
  >
    <div v-if="!jsonUrl" class="lume-lottie-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M12 3l1.5 4.5H18l-3.5 2.5L16 15l-4-3-4 3 1.5-5L6 7.5h4.5L12 3z"/></svg>
      <span>No Lottie animation URL set</span>
    </div>
    <div v-else-if="!isLoaded && !hasError" class="lume-lottie-fallback">
      <!-- CSS animated placeholder -->
      <div class="lume-lottie-pulse">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="1.5"><path d="M12 3l1.5 4.5H18l-3.5 2.5L16 15l-4-3-4 3 1.5-5L6 7.5h4.5L12 3z"/></svg>
      </div>
      <span class="lume-lottie-label">Lottie Animation</span>
    </div>
  </div>
</template>

<style scoped>
.lume-lottie {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 8px;
}
.lume-lottie-empty,
.lume-lottie-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  background: #f9fafb;
  color: #9ca3af;
  font-size: 14px;
}
.lume-lottie-pulse {
  animation: lottie-pulse 2s ease-in-out infinite;
}
@keyframes lottie-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
}
.lume-lottie-label {
  font-size: 12px;
  color: #6b7280;
}
</style>
