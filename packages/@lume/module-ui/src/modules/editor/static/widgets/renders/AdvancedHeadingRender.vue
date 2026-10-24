<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  text?: string;
  tag?: string;
  alignment?: string;
  color?: string;
  fontSize?: number;
  fontWeight?: string;
  separator?: string;
  separatorColor?: string;
  separatorWidth?: number;
}>(), {
  text: 'Heading',
  tag: 'h2',
  alignment: 'left',
  color: '#000000',
  fontSize: 32,
  fontWeight: '600',
  separator: 'none',
  separatorColor: '#e5e7eb',
  separatorWidth: 60,
});

const headingStyle = computed(() => ({
  color: props.color,
  fontSize: `${props.fontSize}px`,
  fontWeight: props.fontWeight,
  textAlign: props.alignment,
}));

const separatorStyle = computed(() => ({
  borderBottomColor: props.separatorColor,
  width: `${props.separatorWidth}px`,
  margin: props.alignment === 'center' ? '12px auto 0' :
          props.alignment === 'right' ? '12px 0 0 auto' : '12px 0 0 0',
}));

const separatorClasses = computed(() => [
  'lume-heading-separator',
  `lume-heading-separator--${props.separator}`,
]);
</script>

<template>
  <div class="lume-advanced-heading">
    <component :is="tag" :style="headingStyle">{{ text }}</component>
    <hr
      v-if="separator !== 'none'"
      :class="separatorClasses"
      :style="separatorStyle"
    />
  </div>
</template>
