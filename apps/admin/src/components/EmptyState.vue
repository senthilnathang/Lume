<template>
  <div
    class="empty-state"
    :class="{ 'empty-state--small': size === 'small', 'empty-state--large': size === 'large' }"
  >
    <div class="empty-state__icon">
      <slot name="icon">
        <component :is="iconComponent" />
      </slot>
    </div>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <div v-if="showAction" class="empty-state__action">
      <slot name="action">
        <a-button type="primary" @click="handleAction">
          <template #icon><Plus :size="14" /></template>
          {{ actionText }}
        </a-button>
      </slot>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { Inbox, Plus } from 'lucide-vue-next';

defineOptions({ name: 'EmptyState' });

withDefaults(defineProps<{
  title?: string;
  description?: string;
  showAction?: boolean;
  actionText?: string;
  size?: 'small' | 'default' | 'large';
}>(), {
  title: 'No data found',
  description: '',
  showAction: false,
  actionText: 'Add New',
  size: 'default',
});

const emit = defineEmits(['action']);
const iconComponent = computed(() => Inbox);

function handleAction() {
  emit('action');
}
</script>
<style scoped>
.empty-state {
  text-align: center;
  padding: 32px 16px;
  color: #999;
}
.empty-state--small {
  padding: 16px 8px;
}
.empty-state--large {
  padding: 64px 16px;
}
.empty-state__icon {
  font-size: 40px;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
}
.empty-state__title {
  font-size: 15px;
  font-weight: 600;
  color: #666;
  margin: 0 0 4px;
}
.empty-state__description {
  font-size: 13px;
  margin: 0 0 12px;
}
</style>
