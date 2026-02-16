<script setup lang="ts">
import { computed } from 'vue';
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-vue-next';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  type?: string;
  title?: string;
}>(), {
  type: 'info',
  title: '',
});

const iconMap: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  error: XCircle,
};

const iconComponent = computed(() => iconMap[props.type] || Info);
</script>

<template>
  <div :class="['lume-callout', `lume-callout--${type}`]">
    <div class="lume-callout-icon">
      <component :is="iconComponent" :size="20" />
    </div>
    <div class="lume-callout-body">
      <div v-if="title" class="lume-callout-title">{{ title }}</div>
      <div class="lume-callout-content">
        <slot />
      </div>
    </div>
  </div>
</template>
