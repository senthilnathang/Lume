<script setup lang="ts">
import { ref, computed } from 'vue';

interface Hotspot {
  x: number;
  y: number;
  title: string;
  description: string;
  link: string;
}

const props = withDefaults(defineProps<{
  image?: string;
  hotspots?: string;
  tooltipStyle?: string;
  pulseAnimation?: boolean;
  tooltipPosition?: string;
}>(), {
  image: '',
  hotspots: '[]',
  tooltipStyle: 'dark',
  pulseAnimation: true,
  tooltipPosition: 'auto',
});

const parsedHotspots = computed<Hotspot[]>(() => {
  try {
    return JSON.parse(props.hotspots);
  } catch {
    return [];
  }
});

const activeIndex = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);

function resolveTooltipSide(spot: Hotspot): 'top' | 'bottom' {
  if (props.tooltipPosition === 'top') return 'top';
  if (props.tooltipPosition === 'bottom') return 'bottom';
  // auto: show above if in bottom half, below if in top half
  return spot.y > 50 ? 'top' : 'bottom';
}

function toggleHotspot(index: number) {
  activeIndex.value = activeIndex.value === index ? null : index;
}

function closeTooltip() {
  activeIndex.value = null;
}
</script>

<template>
  <div class="hotspot-container" ref="containerRef" @click.self="closeTooltip">
    <img v-if="image" :src="image" alt="" class="hotspot-bg-image" />
    <div
      v-for="(spot, i) in parsedHotspots"
      :key="i"
      class="hotspot-point"
      :class="{ 'hotspot-pulse': pulseAnimation }"
      :style="{ left: spot.x + '%', top: spot.y + '%' }"
      @click.stop="toggleHotspot(i)"
    >
      <span class="hotspot-dot-outer" :class="`dot-${tooltipStyle}`"></span>
      <span class="hotspot-dot-inner" :class="`dot-${tooltipStyle}`"></span>

      <Transition name="tooltip-fade">
        <div
          v-if="activeIndex === i"
          class="hotspot-tooltip"
          :class="[
            `tooltip-${tooltipStyle}`,
            `tooltip-${resolveTooltipSide(spot)}`,
          ]"
          @click.stop
        >
          <div v-if="spot.title" class="tooltip-title">{{ spot.title }}</div>
          <div v-if="spot.description" class="tooltip-desc">{{ spot.description }}</div>
          <a
            v-if="spot.link"
            :href="spot.link"
            class="tooltip-link"
            target="_blank"
            rel="noopener noreferrer"
          >Learn more &rarr;</a>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.hotspot-container {
  position: relative;
  display: inline-block;
  width: 100%;
  line-height: 0;
}
.hotspot-bg-image {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
}

/* Hotspot point */
.hotspot-point {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 5;
  cursor: pointer;
}

/* Dot styling */
.hotspot-dot-outer {
  position: absolute;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.3;
}
.hotspot-dot-inner {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Dot color variants */
.dot-dark { background: #1f2937; }
.dot-light { background: #ffffff; border-color: #d1d5db; }
.dot-colored { background: #3b82f6; }

/* Pulse animation */
.hotspot-pulse .hotspot-dot-outer {
  animation: pulse-ring 2s ease-out infinite;
}
@keyframes pulse-ring {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.4;
  }
  70% {
    transform: translate(-50%, -50%) scale(1.6);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0;
  }
}

/* Tooltip */
.hotspot-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 20;
  text-align: left;
  line-height: 1.4;
  font-size: 14px;
}
.tooltip-top {
  bottom: calc(100% + 12px);
}
.tooltip-bottom {
  top: calc(100% + 12px);
}

/* Tooltip color schemes */
.tooltip-dark {
  background: #1f2937;
  color: #f9fafb;
}
.tooltip-dark .tooltip-link { color: #93c5fd; }

.tooltip-light {
  background: #ffffff;
  color: #1f2937;
  border: 1px solid #e5e7eb;
}
.tooltip-light .tooltip-link { color: #3b82f6; }

.tooltip-colored {
  background: #3b82f6;
  color: #ffffff;
}
.tooltip-colored .tooltip-link { color: #dbeafe; }

.tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 15px;
}
.tooltip-desc {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 6px;
}
.tooltip-link {
  font-size: 13px;
  text-decoration: none;
  font-weight: 500;
}
.tooltip-link:hover {
  text-decoration: underline;
}

/* Tooltip transition */
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}
</style>
