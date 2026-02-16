<script setup lang="ts">
import '../widget-styles.css';

interface PriceListItem {
  title: string;
  description?: string;
  price: string;
  image?: string;
}

withDefaults(defineProps<{
  items?: PriceListItem[];
  separator?: boolean;
}>(), {
  items: () => [
    { title: 'Espresso', description: 'Rich and bold', price: '$3.50' },
    { title: 'Cappuccino', description: 'With steamed milk foam', price: '$4.50' },
    { title: 'Latte', description: 'Smooth and creamy', price: '$5.00' },
  ],
  separator: true,
});
</script>

<template>
  <div class="lume-price-list">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="lume-price-list-item"
    >
      <img
        v-if="item.image"
        :src="item.image"
        :alt="item.title"
        style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; flex-shrink: 0;"
      />
      <div style="flex-shrink: 0;">
        <span class="lume-price-list-title">{{ item.title }}</span>
        <div v-if="item.description" class="lume-price-list-description">
          {{ item.description }}
        </div>
      </div>
      <span v-if="separator" class="lume-price-list-separator" />
      <span v-else style="flex: 1;" />
      <span class="lume-price-list-price">{{ item.price }}</span>
    </div>
  </div>
</template>
