<script setup lang="ts">
import { computed } from 'vue';
import { Check, Star, ArrowRight, Circle, Zap, Heart } from 'lucide-vue-next';
import '../widget-styles.css';

interface IconListItem {
  text: string;
  icon?: string;
  url?: string;
}

const props = withDefaults(defineProps<{
  items?: IconListItem[];
  iconColor?: string;
  iconSize?: number;
  layout?: string;
  connector?: boolean;
}>(), {
  items: () => [],
  iconColor: '#3b82f6',
  iconSize: 20,
  layout: 'vertical',
  connector: false,
});

const iconMap: Record<string, any> = {
  check: Check,
  star: Star,
  arrow: ArrowRight,
  circle: Circle,
  zap: Zap,
  heart: Heart,
};

function getIcon(name?: string) {
  return iconMap[name || 'check'] || Check;
}

const listClasses = computed(() => [
  'lume-icon-list',
  props.layout === 'horizontal' ? 'lume-icon-list--horizontal' : '',
]);
</script>

<template>
  <ul :class="listClasses">
    <li
      v-for="(item, index) in items"
      :key="index"
      class="lume-icon-list-item"
    >
      <span
        class="lume-icon-list-item-icon"
        :style="{ color: iconColor }"
      >
        <component :is="getIcon(item.icon)" :size="iconSize" />
      </span>
      <a
        v-if="item.url"
        :href="item.url"
        class="lume-icon-list-item-text"
        :style="{ color: 'inherit', textDecoration: 'none' }"
      >
        {{ item.text }}
      </a>
      <span v-else class="lume-icon-list-item-text">{{ item.text }}</span>
      <span
        v-if="connector && layout === 'vertical' && index < items.length - 1"
        class="lume-icon-list-connector"
      />
    </li>
  </ul>
</template>
