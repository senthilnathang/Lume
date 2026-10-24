<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import '../widget-styles.css';

interface Slide {
  image: string;
  title?: string;
  description?: string;
  link?: string;
}

const props = withDefaults(defineProps<{
  slides?: Slide[] | string;
  autoplay?: boolean;
  loop?: boolean;
  slidesPerView?: number;
  navigation?: boolean;
  pagination?: boolean;
  effect?: string;
  interval?: number;
}>(), {
  slides: () => [],
  autoplay: true,
  loop: true,
  slidesPerView: 1,
  navigation: true,
  pagination: true,
  effect: 'slide',
  interval: 3000,
});

const parsedSlides = computed<Slide[]>(() => {
  if (typeof props.slides === 'string') {
    try {
      const parsed = JSON.parse(props.slides);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(props.slides) ? props.slides : [];
});

const currentIndex = ref(0);
const isTransitioning = ref(false);
let autoplayTimer: ReturnType<typeof setInterval> | null = null;

const slideCount = computed(() => parsedSlides.value.length);

const isFade = computed(() => props.effect === 'fade');
const isCube = computed(() => props.effect === 'cube');

const trackStyle = computed(() => {
  if (isFade.value || isCube.value) return {};
  const slideWidth = 100 / props.slidesPerView;
  return {
    transform: `translateX(-${currentIndex.value * slideWidth}%)`,
    transition: isTransitioning.value ? 'transform 0.5s ease' : 'none',
  };
});

function goTo(index: number) {
  if (slideCount.value === 0) return;
  isTransitioning.value = true;
  if (props.loop) {
    currentIndex.value = ((index % slideCount.value) + slideCount.value) % slideCount.value;
  } else {
    currentIndex.value = Math.max(0, Math.min(index, slideCount.value - 1));
  }
}

function next() {
  goTo(currentIndex.value + 1);
}

function prev() {
  goTo(currentIndex.value - 1);
}

function startAutoplay() {
  stopAutoplay();
  if (props.autoplay && slideCount.value > 1) {
    autoplayTimer = setInterval(next, props.interval);
  }
}

function stopAutoplay() {
  if (autoplayTimer) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}

onMounted(() => {
  startAutoplay();
});

onUnmounted(() => {
  stopAutoplay();
});

watch(() => props.autoplay, () => {
  if (props.autoplay) startAutoplay();
  else stopAutoplay();
});
</script>

<template>
  <div
    class="lume-carousel"
    :class="[
      `lume-carousel--${effect}`,
      { 'lume-carousel--has-nav': navigation, 'lume-carousel--has-dots': pagination },
    ]"
    @mouseenter="stopAutoplay"
    @mouseleave="startAutoplay"
  >
    <div class="lume-carousel-viewport">
      <!-- Slide / Scroll-snap mode -->
      <div v-if="!isFade && !isCube" class="lume-carousel-track" :style="trackStyle">
        <div
          v-for="(slide, i) in parsedSlides"
          :key="i"
          class="lume-carousel-slide"
          :style="{ flexBasis: `${100 / slidesPerView}%` }"
        >
          <a v-if="slide.link" :href="slide.link" class="lume-carousel-slide-link">
            <img v-if="slide.image" :src="slide.image" :alt="slide.title || ''" class="lume-carousel-image" />
            <div v-if="slide.title || slide.description" class="lume-carousel-caption">
              <h3 v-if="slide.title" class="lume-carousel-title">{{ slide.title }}</h3>
              <p v-if="slide.description" class="lume-carousel-desc">{{ slide.description }}</p>
            </div>
          </a>
          <template v-else>
            <img v-if="slide.image" :src="slide.image" :alt="slide.title || ''" class="lume-carousel-image" />
            <div v-if="slide.title || slide.description" class="lume-carousel-caption">
              <h3 v-if="slide.title" class="lume-carousel-title">{{ slide.title }}</h3>
              <p v-if="slide.description" class="lume-carousel-desc">{{ slide.description }}</p>
            </div>
          </template>
        </div>
      </div>

      <!-- Fade mode -->
      <div v-if="isFade" class="lume-carousel-fade-container">
        <div
          v-for="(slide, i) in parsedSlides"
          :key="i"
          class="lume-carousel-fade-slide"
          :class="{ 'is-active': i === currentIndex }"
        >
          <img v-if="slide.image" :src="slide.image" :alt="slide.title || ''" class="lume-carousel-image" />
          <div v-if="slide.title || slide.description" class="lume-carousel-caption">
            <h3 v-if="slide.title" class="lume-carousel-title">{{ slide.title }}</h3>
            <p v-if="slide.description" class="lume-carousel-desc">{{ slide.description }}</p>
          </div>
        </div>
      </div>

      <!-- Cube mode -->
      <div v-if="isCube" class="lume-carousel-cube-container">
        <div
          class="lume-carousel-cube"
          :style="{ transform: `rotateY(${-currentIndex * 90}deg)` }"
        >
          <div
            v-for="(slide, i) in parsedSlides.slice(0, 4)"
            :key="i"
            class="lume-carousel-cube-face"
            :class="`lume-carousel-cube-face--${i}`"
          >
            <img v-if="slide.image" :src="slide.image" :alt="slide.title || ''" class="lume-carousel-image" />
            <div v-if="slide.title || slide.description" class="lume-carousel-caption">
              <h3 v-if="slide.title" class="lume-carousel-title">{{ slide.title }}</h3>
              <p v-if="slide.description" class="lume-carousel-desc">{{ slide.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation arrows -->
    <template v-if="navigation && slideCount > 1">
      <button class="lume-carousel-nav lume-carousel-nav--prev" @click="prev" aria-label="Previous slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="lume-carousel-nav lume-carousel-nav--next" @click="next" aria-label="Next slide">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </template>

    <!-- Dot pagination -->
    <div v-if="pagination && slideCount > 1" class="lume-carousel-dots">
      <button
        v-for="i in slideCount"
        :key="i"
        class="lume-carousel-dot"
        :class="{ 'is-active': i - 1 === currentIndex }"
        @click="goTo(i - 1)"
        :aria-label="`Go to slide ${i}`"
      />
    </div>
  </div>
</template>

<style scoped>
.lume-carousel {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
}

/* Viewport */
.lume-carousel-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
}

/* Slide track (default slide effect) */
.lume-carousel-track {
  display: flex;
  will-change: transform;
}
.lume-carousel-slide {
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
.lume-carousel-slide-link {
  display: block;
  text-decoration: none;
  color: inherit;
}
.lume-carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lume-carousel-caption {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
}
.lume-carousel-title {
  margin: 0 0 4px;
  font-size: 20px;
  font-weight: 700;
}
.lume-carousel-desc {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

/* Fade effect */
.lume-carousel-fade-container {
  position: relative;
  width: 100%;
}
.lume-carousel-fade-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
.lume-carousel-fade-slide:first-child {
  position: relative;
}
.lume-carousel-fade-slide.is-active {
  opacity: 1;
  pointer-events: auto;
}

/* Cube effect */
.lume-carousel-cube-container {
  perspective: 1000px;
  width: 100%;
  aspect-ratio: 16 / 9;
}
.lume-carousel-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
}
.lume-carousel-cube-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  overflow: hidden;
}
.lume-carousel-cube-face--0 { transform: rotateY(0deg) translateZ(50%); }
.lume-carousel-cube-face--1 { transform: rotateY(90deg) translateZ(50%); }
.lume-carousel-cube-face--2 { transform: rotateY(180deg) translateZ(50%); }
.lume-carousel-cube-face--3 { transform: rotateY(270deg) translateZ(50%); }

/* Navigation arrows */
.lume-carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: background 0.2s, transform 0.2s;
}
.lume-carousel-nav:hover {
  background: #fff;
  transform: translateY(-50%) scale(1.05);
}
.lume-carousel-nav--prev { left: 12px; }
.lume-carousel-nav--next { right: 12px; }

/* Dot pagination */
.lume-carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
}
.lume-carousel-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: #d1d5db;
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
}
.lume-carousel-dot.is-active {
  background: #3b82f6;
  transform: scale(1.2);
}
.lume-carousel-dot:hover {
  background: #9ca3af;
}
</style>
