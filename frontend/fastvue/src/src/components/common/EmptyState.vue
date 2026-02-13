<script lang="ts" setup>
import { Button } from 'ant-design-vue';
import { PlusOutlined, InboxOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'EmptyState',
});

withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    icon?: any;
    showAction?: boolean;
    actionText?: string;
    size?: 'small' | 'default' | 'large';
  }>(),
  {
    title: 'No data found',
    description: '',
    showAction: false,
    actionText: 'Add New',
    size: 'default',
  }
);

const emit = defineEmits<{
  (e: 'action'): void;
}>();

function handleAction() {
  emit('action');
}
</script>

<template>
  <div
    class="empty-state"
    :class="{
      'empty-state--small': size === 'small',
      'empty-state--large': size === 'large',
    }"
  >
    <div class="empty-state__icon">
      <slot name="icon">
        <component :is="icon || InboxOutlined" />
      </slot>
    </div>
    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <slot name="action">
      <Button v-if="showAction" type="primary" @click="handleAction">
        <template #icon>
          <PlusOutlined />
        </template>
        {{ actionText }}
      </Button>
    </slot>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  text-align: center;
}

.empty-state--small {
  padding: 24px 16px;
}

.empty-state--large {
  padding: 64px 16px;
}

.empty-state__icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.empty-state--small .empty-state__icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-state--large .empty-state__icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.empty-state__title {
  font-size: 16px;
  font-weight: 500;
  color: #595959;
  margin: 0 0 8px 0;
}

.empty-state--small .empty-state__title {
  font-size: 14px;
}

.empty-state__description {
  font-size: 14px;
  color: #8c8c8c;
  margin: 0 0 16px 0;
  max-width: 300px;
}

/* Dark mode support */
:root.dark .empty-state__icon {
  color: #434343;
}

:root.dark .empty-state__title {
  color: #bfbfbf;
}

:root.dark .empty-state__description {
  color: #8c8c8c;
}
</style>
