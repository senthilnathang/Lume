<template>
  <div v-if="transitionType !== 'none'">
    <!-- Transition overlay -->
    <div
      :class="['lume-page-transition', `lume-page-transition--${transitionType}`, { active: isTransitioning }]"
      :style="{ '--transition-color': transitionColor }"
    />

    <!-- Preloader -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showPreloader"
        class="lume-preloader"
        :style="{ '--transition-color': transitionColor }"
      >
        <!-- Spinner -->
        <div v-if="preloaderType === 'spinner'" class="lume-preloader-spinner" />

        <!-- Dots -->
        <div v-else-if="preloaderType === 'dots'" class="lume-preloader-dots">
          <div class="lume-preloader-dot" />
          <div class="lume-preloader-dot" />
          <div class="lume-preloader-dot" />
        </div>

        <!-- Progress bar -->
        <div v-else-if="preloaderType === 'progress-bar'" class="lume-preloader-progress">
          <div class="lume-preloader-progress-bar" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  transitionType?: 'none' | 'fade' | 'slide' | 'circle'
  transitionColor?: string
  preloaderType?: 'none' | 'spinner' | 'dots' | 'progress-bar'
}>(), {
  transitionType: 'none',
  transitionColor: '#ffffff',
  preloaderType: 'none',
})

const isTransitioning = ref(false)
const showPreloader = ref(false)
const router = useRouter()

let transitionTimer: ReturnType<typeof setTimeout> | null = null
let preloaderTimer: ReturnType<typeof setTimeout> | null = null

// Duration map for different transition types (ms)
const durationMap: Record<string, number> = {
  fade: 300,
  slide: 400,
  circle: 500,
}

router.beforeEach((_to, _from, next) => {
  if (props.transitionType === 'none') {
    next()
    return
  }

  // Show transition overlay
  isTransitioning.value = true

  // Show preloader if configured
  if (props.preloaderType !== 'none') {
    showPreloader.value = true
  }

  const duration = durationMap[props.transitionType] || 300

  // Wait for the transition to cover the screen, then proceed
  transitionTimer = setTimeout(() => {
    next()
  }, duration)
})

router.afterEach(() => {
  if (props.transitionType === 'none') return

  const duration = durationMap[props.transitionType] || 300

  // After new page loads, reverse the transition
  preloaderTimer = setTimeout(() => {
    showPreloader.value = false
    isTransitioning.value = false
  }, duration + 100)
})

onUnmounted(() => {
  if (transitionTimer) clearTimeout(transitionTimer)
  if (preloaderTimer) clearTimeout(preloaderTimer)
})
</script>
