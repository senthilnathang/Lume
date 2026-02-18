<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  beforeImage?: string;
  afterImage?: string;
  beforeLabel?: string;
  afterLabel?: string;
  orientation?: string;
  handleColor?: string;
  handleWidth?: number;
  startPosition?: number;
}>(), {
  beforeImage: '',
  afterImage: '',
  beforeLabel: 'Before',
  afterLabel: 'After',
  orientation: 'horizontal',
  handleColor: '#ffffff',
  handleWidth: 4,
  startPosition: 50,
});

const position = ref(props.startPosition);
const isDragging = ref(false);
const containerRef = ref<HTMLElement | null>(null);

function onPointerDown(e: PointerEvent) {
  isDragging.value = true;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  updatePosition(e);
}

function onPointerMove(e: PointerEvent) {
  if (!isDragging.value) return;
  updatePosition(e);
}

function onPointerUp() {
  isDragging.value = false;
}

function updatePosition(e: PointerEvent) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  if (props.orientation === 'horizontal') {
    position.value = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
  } else {
    position.value = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
  }
}

const clipBefore = computed(() => {
  if (props.orientation === 'horizontal') {
    return `inset(0 ${100 - position.value}% 0 0)`;
  }
  return `inset(0 0 ${100 - position.value}% 0)`;
});
</script>

<template>
  <div
    class="lume-before-after"
    :class="`lume-before-after--${orientation}`"
    ref="containerRef"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <!-- After image (bottom layer) -->
    <img v-if="afterImage" :src="afterImage" :alt="afterLabel" class="lume-ba-img lume-ba-after" />
    <div v-else class="lume-ba-placeholder lume-ba-after">{{ afterLabel }}</div>

    <!-- Before image (top layer, clipped) -->
    <div class="lume-ba-before-container" :style="{ clipPath: clipBefore }">
      <img v-if="beforeImage" :src="beforeImage" :alt="beforeLabel" class="lume-ba-img" />
      <div v-else class="lume-ba-placeholder">{{ beforeLabel }}</div>
    </div>

    <!-- Labels -->
    <span class="lume-ba-label lume-ba-label--before">{{ beforeLabel }}</span>
    <span class="lume-ba-label lume-ba-label--after">{{ afterLabel }}</span>

    <!-- Handle -->
    <div
      class="lume-ba-handle"
      :style="{
        [orientation === 'horizontal' ? 'left' : 'top']: position + '%',
        [orientation === 'horizontal' ? 'width' : 'height']: handleWidth + 'px',
        backgroundColor: handleColor,
      }"
      @pointerdown="onPointerDown"
    >
      <div class="lume-ba-handle-knob" :style="{ borderColor: handleColor }">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M8 6l-4 6 4 6"/><path d="M16 6l4 6-4 6"/></svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lume-before-after {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 8px;
  user-select: none;
  cursor: ew-resize;
  aspect-ratio: 16 / 10;
}
.lume-before-after--vertical { cursor: ns-resize; }

.lume-ba-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  inset: 0;
}
.lume-ba-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
}
.lume-ba-before-container {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.lume-ba-label {
  position: absolute;
  z-index: 3;
  padding: 4px 12px;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  pointer-events: none;
}
.lume-ba-label--before { top: 12px; left: 12px; }
.lume-ba-label--after { bottom: 12px; right: 12px; }

.lume-ba-handle {
  position: absolute;
  z-index: 2;
  cursor: ew-resize;
}
.lume-before-after--horizontal .lume-ba-handle {
  top: 0;
  bottom: 0;
  transform: translateX(-50%);
}
.lume-before-after--vertical .lume-ba-handle {
  left: 0;
  right: 0;
  transform: translateY(-50%);
  cursor: ns-resize;
}
.lume-ba-handle-knob {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  border: 3px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  color: #374151;
}
</style>
