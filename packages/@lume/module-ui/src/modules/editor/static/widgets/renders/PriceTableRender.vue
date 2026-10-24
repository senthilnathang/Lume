<script setup lang="ts">
import { computed } from 'vue';
import '../widget-styles.css';

interface PriceFeature {
  text: string;
  included: boolean;
}

const props = withDefaults(defineProps<{
  title?: string;
  price?: string;
  period?: string;
  features?: PriceFeature[];
  ctaText?: string;
  ctaUrl?: string;
  highlighted?: boolean;
  ribbonText?: string;
}>(), {
  title: 'Basic Plan',
  price: '$29',
  period: '/month',
  features: () => [],
  ctaText: 'Get Started',
  ctaUrl: '',
  highlighted: false,
  ribbonText: '',
});

const containerClasses = computed(() => [
  'lume-price-table',
  props.highlighted ? 'lume-price-table--highlighted' : '',
]);
</script>

<template>
  <div :class="containerClasses">
    <div v-if="ribbonText" class="lume-price-table-ribbon">
      {{ ribbonText }}
    </div>
    <div class="lume-price-table-header">
      <h3 class="lume-price-table-title">{{ title }}</h3>
    </div>
    <div class="lume-price-table-price">{{ price }}</div>
    <div class="lume-price-table-period">{{ period }}</div>
    <ul class="lume-price-table-features">
      <li
        v-for="(feature, index) in features"
        :key="index"
        :class="feature.included ? 'lume-price-table-feature--included' : 'lume-price-table-feature--excluded'"
      >
        {{ feature.text }}
      </li>
    </ul>
    <a :href="ctaUrl || '#'" class="lume-price-table-cta">
      {{ ctaText }}
    </a>
  </div>
</template>
