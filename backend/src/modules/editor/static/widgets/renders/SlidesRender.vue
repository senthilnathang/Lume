<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import '../widget-styles.css';

interface Slide {
  bgImage: string;
  heading: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
}

const props = withDefaults(defineProps<{
  slides?: Slide[] | string;
  autoplay?: boolean;
  effect?: string;
  height?: number;
  overlayColor?: string;
  interval?: number;
}>(), {
  slides: () => [],
  autoplay: true,
  effect: 'fade',
  height: 500,
  overlayColor: 'rgba(0,0,0,0.3)',
  interval: 5000,
});

const parsedSlides = computed<Slide[]>(() => {
  if (typeof props.slides === 'string') {
    try { return JSON.parse(props.slides); } catch { return []; }
  }
  return Array.isArray(props.slides) ? props.slides : [];
});

const currentIndex = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

function next() {
  if (parsedSlides.value.length <= 1) return;
  currentIndex.value = (currentIndex.value + 1) % parsedSlides.value.length;
}

function prev() {
  if (parsedSlides.value.length <= 1) return;
  currentIndex.value = (currentIndex.value - 1 + parsedSlides.value.length) % parsedSlides.value.length;
}

function goTo(i: number) { currentIndex.value = i; }

function startAutoplay() {
  stopAutoplay();
  if (props.autoplay && parsedSlides.value.length > 1) {
    timer = setInterval(next, props.interval);
  }
}

function stopAutoplay() {
  if (timer) { clearInterval(timer); timer = null; }
}

onMounted(() => startAutoplay());
onUnmounted(() => stopAutoplay());
</script>

<template>
  <div
    class="lume-slides"
    :style="{ height: height + 'px' }"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div
      v-for="(slide, i) in parsedSlides"
      :key="i"
      class="lume-slides-item"
      :class="[
        { 'is-active': i === currentIndex },
        `lume-slides--${effect}`,
      ]"
      :style="slide.bgImage ? { backgroundImage: `url(${slide.bgImage})` } : { background: '#1e293b' }"
    >
      <div class="lume-slides-overlay" :style="{ background: overlayColor }">
        <div class="lume-slides-content">
          <h2 v-if="slide.heading" class="lume-slides-heading">{{ slide.heading }}</h2>
          <p v-if="slide.description" class="lume-slides-desc">{{ slide.description }}</p>
          <a v-if="slide.buttonText" :href="slide.buttonUrl || '#'" class="lume-slides-cta">{{ slide.buttonText }}</a>
        </div>
      </div>
    </div>

    <!-- Nav arrows -->
    <template v-if="parsedSlides.length > 1">
      <button class="lume-slides-nav lume-slides-nav--prev" @click="prev" aria-label="Previous">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="lume-slides-nav lume-slides-nav--next" @click="next" aria-label="Next">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </template>

    <!-- Dots -->
    <div v-if="parsedSlides.length > 1" class="lume-slides-dots">
      <button
        v-for="(_, i) in parsedSlides"
        :key="i"
        class="lume-slides-dot"
        :class="{ 'is-active': i === currentIndex }"
        @click="goTo(i)"
      />
    </div>
  </div>
</template>

<style scoped>
.lume-slides {
  position: relative;
  width: 100%;
  overflow: hidden;
}
.lume-slides-item {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  opacity: 0;
  transition: opacity 0.8s ease;
  pointer-events: none;
}
.lume-slides-item:first-child { position: relative; }
.lume-slides-item.is-active { opacity: 1; pointer-events: auto; }

/* Slide effect */
.lume-slides-item.lume-slides--slide {
  transition: transform 0.6s ease, opacity 0.6s ease;
  transform: translateX(100%);
}
.lume-slides-item.lume-slides--slide.is-active { transform: translateX(0); }

.lume-slides-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lume-slides-content {
  text-align: center;
  padding: 40px;
  max-width: 800px;
}
.lume-slides-heading {
  color: white;
  font-size: 42px;
  font-weight: 700;
  margin: 0 0 16px;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
.lume-slides-desc {
  color: rgba(255,255,255,0.9);
  font-size: 18px;
  margin: 0 0 24px;
  line-height: 1.6;
}
.lume-slides-cta {
  display: inline-block;
  padding: 12px 32px;
  background: #1677ff;
  color: white;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s;
}
.lume-slides-cta:hover { background: #1262cc; }

.lume-slides-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(4px);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s;
}
.lume-slides-nav:hover { background: rgba(255,255,255,0.4); }
.lume-slides-nav--prev { left: 16px; }
.lume-slides-nav--next { right: 16px; }

.lume-slides-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 2;
}
.lume-slides-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.7);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}
.lume-slides-dot.is-active {
  background: white;
  transform: scale(1.2);
}
</style>
