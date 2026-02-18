<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = withDefaults(defineProps<{
  beforeText?: string;
  rotatingTexts?: string;
  afterText?: string;
  effect?: string;
  speed?: number;
  tag?: string;
  color?: string;
  alignment?: string;
}>(), {
  beforeText: 'This is',
  rotatingTexts: '["Amazing","Creative","Beautiful"]',
  afterText: '',
  effect: 'typing',
  speed: 2000,
  tag: 'h2',
  color: '#3b82f6',
  alignment: 'center',
});

const texts = computed<string[]>(() => {
  try {
    return JSON.parse(props.rotatingTexts);
  } catch {
    return ['Text'];
  }
});

const currentIndex = ref(0);
const displayText = ref('');
const isDeleting = ref(false);
const isVisible = ref(true);
const slideDirection = ref<'in' | 'out'>('in');
const clipProgress = ref(100);

let intervalId: ReturnType<typeof setInterval> | null = null;
let typingTimeoutId: ReturnType<typeof setTimeout> | null = null;

function startTypingEffect() {
  const currentWord = texts.value[currentIndex.value] || '';
  let charIndex = 0;
  isDeleting.value = false;
  displayText.value = '';

  function tick() {
    if (!isDeleting.value) {
      displayText.value = currentWord.slice(0, charIndex + 1);
      charIndex++;
      if (charIndex >= currentWord.length) {
        typingTimeoutId = setTimeout(() => {
          isDeleting.value = true;
          tick();
        }, props.speed);
        return;
      }
      typingTimeoutId = setTimeout(tick, 80);
    } else {
      displayText.value = currentWord.slice(0, charIndex);
      charIndex--;
      if (charIndex < 0) {
        currentIndex.value = (currentIndex.value + 1) % texts.value.length;
        typingTimeoutId = setTimeout(startTypingEffect, 300);
        return;
      }
      typingTimeoutId = setTimeout(tick, 50);
    }
  }
  tick();
}

function startFadeEffect() {
  displayText.value = texts.value[currentIndex.value] || '';
  isVisible.value = true;

  intervalId = setInterval(() => {
    isVisible.value = false;
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % texts.value.length;
      displayText.value = texts.value[currentIndex.value] || '';
      isVisible.value = true;
    }, 400);
  }, props.speed);
}

function startSlideEffect() {
  displayText.value = texts.value[currentIndex.value] || '';
  slideDirection.value = 'in';

  intervalId = setInterval(() => {
    slideDirection.value = 'out';
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % texts.value.length;
      displayText.value = texts.value[currentIndex.value] || '';
      slideDirection.value = 'in';
    }, 400);
  }, props.speed);
}

function startClipEffect() {
  displayText.value = texts.value[currentIndex.value] || '';
  clipProgress.value = 100;

  intervalId = setInterval(() => {
    clipProgress.value = 0;
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % texts.value.length;
      displayText.value = texts.value[currentIndex.value] || '';
      clipProgress.value = 100;
    }, 500);
  }, props.speed);
}

function startRotateEffect() {
  displayText.value = texts.value[currentIndex.value] || '';
  isVisible.value = true;

  intervalId = setInterval(() => {
    isVisible.value = false;
    setTimeout(() => {
      currentIndex.value = (currentIndex.value + 1) % texts.value.length;
      displayText.value = texts.value[currentIndex.value] || '';
      isVisible.value = true;
    }, 400);
  }, props.speed);
}

function cleanup() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  if (typingTimeoutId) { clearTimeout(typingTimeoutId); typingTimeoutId = null; }
}

onMounted(() => {
  if (texts.value.length === 0) return;

  switch (props.effect) {
    case 'typing': startTypingEffect(); break;
    case 'fade': startFadeEffect(); break;
    case 'slide': startSlideEffect(); break;
    case 'clip': startClipEffect(); break;
    case 'rotate': startRotateEffect(); break;
    default: startTypingEffect();
  }
});

onUnmounted(cleanup);
</script>

<template>
  <div class="animated-headline" :style="{ textAlign: alignment }">
    <component :is="tag" class="animated-headline-text">
      <span v-if="beforeText" class="ah-before">{{ beforeText }}&nbsp;</span>
      <span
        class="ah-rotating"
        :class="[
          `ah-effect-${effect}`,
          { 'ah-visible': isVisible, 'ah-hidden': !isVisible },
          { 'ah-slide-in': slideDirection === 'in', 'ah-slide-out': slideDirection === 'out' },
        ]"
        :style="{
          color,
          clipPath: effect === 'clip' ? `inset(0 ${100 - clipProgress}% 0 0)` : undefined,
        }"
      >{{ displayText }}<span v-if="effect === 'typing'" class="ah-cursor">|</span></span>
      <span v-if="afterText" class="ah-after">&nbsp;{{ afterText }}</span>
    </component>
  </div>
</template>

<style scoped>
.animated-headline-text {
  margin: 0;
  line-height: 1.3;
}

.ah-rotating {
  display: inline-block;
  position: relative;
  font-weight: 700;
  transition: opacity 0.4s ease, transform 0.4s ease, clip-path 0.5s ease;
}

/* Typing cursor */
.ah-cursor {
  display: inline-block;
  animation: blink 0.7s step-end infinite;
  font-weight: 300;
  margin-left: 1px;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* Fade effect */
.ah-effect-fade.ah-visible {
  opacity: 1;
  transform: translateY(0);
}
.ah-effect-fade.ah-hidden {
  opacity: 0;
  transform: translateY(4px);
}

/* Slide effect */
.ah-effect-slide {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.ah-effect-slide.ah-slide-in {
  opacity: 1;
  transform: translateY(0);
}
.ah-effect-slide.ah-slide-out {
  opacity: 0;
  transform: translateY(-100%);
}

/* Clip effect */
.ah-effect-clip {
  transition: clip-path 0.5s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Rotate effect */
.ah-effect-rotate {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.ah-effect-rotate.ah-visible {
  opacity: 1;
  transform: rotateX(0deg);
}
.ah-effect-rotate.ah-hidden {
  opacity: 0;
  transform: rotateX(90deg);
}
</style>
