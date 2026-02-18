<script setup lang="ts">
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  frontTitle?: string;
  frontDescription?: string;
  frontIcon?: string;
  frontBgColor?: string;
  backTitle?: string;
  backDescription?: string;
  backBgColor?: string;
  backTextColor?: string;
  flipDirection?: string;
  height?: number;
  backLinkUrl?: string;
  backLinkText?: string;
}>(), {
  frontTitle: 'Front Side',
  frontDescription: 'Hover to flip',
  frontIcon: 'layers',
  frontBgColor: '#ffffff',
  backTitle: 'Back Side',
  backDescription: 'More details here',
  backBgColor: '#3b82f6',
  backTextColor: '#ffffff',
  flipDirection: 'horizontal',
  height: 280,
  backLinkUrl: '',
  backLinkText: 'Learn More',
});

const iconPaths: Record<string, string> = {
  layers: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  zap: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  award: 'M12 15l-2 5h4l-2-5zM12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14z',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
};
</script>

<template>
  <div
    class="lume-flipbox"
    :class="`lume-flipbox--${flipDirection}`"
    :style="{ height: `${height}px` }"
  >
    <div class="lume-flipbox-inner">
      <!-- Front Face -->
      <div
        class="lume-flipbox-face lume-flipbox-front"
        :style="{
          background: frontBgColor,
          color: frontBgColor === '#ffffff' || frontBgColor === '#fff' ? '#374151' : '#ffffff',
          borderColor: frontBgColor === '#ffffff' || frontBgColor === '#fff' ? '#e5e7eb' : 'transparent',
        }"
      >
        <div class="lume-flipbox-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path :d="iconPaths[frontIcon] || iconPaths.layers" />
          </svg>
        </div>
        <h3 class="lume-flipbox-title">{{ frontTitle }}</h3>
        <p class="lume-flipbox-desc">{{ frontDescription }}</p>
      </div>

      <!-- Back Face -->
      <div
        class="lume-flipbox-face lume-flipbox-back"
        :style="{ background: backBgColor, color: backTextColor }"
      >
        <h3 class="lume-flipbox-title">{{ backTitle }}</h3>
        <p class="lume-flipbox-desc">{{ backDescription }}</p>
        <a
          v-if="backLinkUrl"
          :href="backLinkUrl"
          class="lume-flipbox-cta"
          :style="{ color: backTextColor, borderColor: backTextColor }"
        >
          {{ backLinkText }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lume-flipbox {
  perspective: 1000px;
  width: 100%;
  cursor: pointer;
}

.lume-flipbox-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

/* Horizontal flip (rotateY) */
.lume-flipbox--horizontal:hover .lume-flipbox-inner {
  transform: rotateY(180deg);
}
.lume-flipbox--horizontal .lume-flipbox-back {
  transform: rotateY(180deg);
}

/* Vertical flip (rotateX) */
.lume-flipbox--vertical:hover .lume-flipbox-inner {
  transform: rotateX(180deg);
}
.lume-flipbox--vertical .lume-flipbox-back {
  transform: rotateX(180deg);
}

.lume-flipbox-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-radius: 12px;
  backface-visibility: hidden;
  text-align: center;
  border: 1px solid transparent;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.lume-flipbox-front {
  z-index: 2;
}

.lume-flipbox-back {
  z-index: 1;
}

.lume-flipbox-icon {
  margin-bottom: 12px;
  opacity: 0.85;
}

.lume-flipbox-title {
  margin: 0 0 8px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.lume-flipbox-desc {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  opacity: 0.85;
  max-width: 280px;
}

.lume-flipbox-cta {
  display: inline-block;
  margin-top: 16px;
  padding: 8px 24px;
  border: 2px solid;
  border-radius: 6px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: opacity 0.2s;
}
.lume-flipbox-cta:hover {
  opacity: 0.8;
}
</style>
