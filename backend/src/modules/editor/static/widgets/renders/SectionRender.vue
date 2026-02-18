<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';
import '../motion-fx.css';

const props = withDefaults(defineProps<{
  backgroundColor?: string;
  backgroundImage?: string;
  paddingTop?: string | number;
  paddingBottom?: string | number;
  maxWidth?: string | number;
  scrollSnap?: string;
  stickyPosition?: string;
  stickyOffset?: string | number;
  stickyZIndex?: string | number;
  motionFx?: string;
  interactions?: string;
}>(), {
  backgroundColor: 'transparent',
  backgroundImage: '',
  paddingTop: '40',
  paddingBottom: '40',
  maxWidth: '1200',
  scrollSnap: 'none',
  stickyPosition: 'none',
  stickyOffset: '0',
  stickyZIndex: '100',
  motionFx: '{}',
  interactions: '[]',
});

const sectionStyles = computed(() => ({
  backgroundColor: props.backgroundColor,
  backgroundImage: props.backgroundImage ? `url(${props.backgroundImage})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  paddingTop: `${props.paddingTop}px`,
  paddingBottom: `${props.paddingBottom}px`,
}));

const innerStyles = computed(() => ({
  maxWidth: `${props.maxWidth}px`,
  margin: '0 auto',
}));

const sectionClasses = computed(() => {
  const classes = ['lume-section'];
  if (props.scrollSnap && props.scrollSnap !== 'none') {
    classes.push(`lume-scroll-snap-${props.scrollSnap}`);
  }
  return classes;
});

const dataAttrs = computed(() => {
  const attrs: Record<string, string> = {};
  if (props.stickyPosition && props.stickyPosition !== 'none') {
    attrs['data-sticky-position'] = props.stickyPosition;
    attrs['data-sticky-offset'] = String(props.stickyOffset);
    attrs['data-sticky-z'] = String(props.stickyZIndex);
  }
  if (props.motionFx && props.motionFx !== '{}') {
    attrs['data-motion-fx'] = props.motionFx;
  }
  if (props.interactions && props.interactions !== '[]') {
    attrs['data-interactions'] = props.interactions;
  }
  return attrs;
});
</script>

<template>
  <section :class="sectionClasses" :style="sectionStyles" v-bind="dataAttrs">
    <div class="lume-section-inner" :style="innerStyles">
      <slot />
    </div>
  </section>
</template>
