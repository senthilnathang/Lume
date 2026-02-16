<template>
  <a-drawer
    :open="open"
    :title="drawerTitle"
    placement="right"
    :width="380"
    :headerStyle="{ borderBottom: '1px solid #f0f0f0', padding: '12px 16px' }"
    :bodyStyle="{ padding: '12px 16px' }"
    @close="$emit('close')"
  >
    <template #extra>
      <a-tag v-if="widgetDef" :color="categoryColors[widgetDef.category]" size="small">
        {{ widgetDef.category }}
      </a-tag>
    </template>

    <div v-if="widgetDef" class="edit-settings-content">
      <SettingsRenderer
        :attributes="widgetDef.attributes"
        :values="blockAttrs"
        @update="handleAttrUpdate"
      />
    </div>

    <div v-else class="edit-settings-empty">
      <p>Select a block to edit its settings.</p>
      <p class="text-xs text-gray-400 mt-2">
        Block type: <code>{{ blockType }}</code>
      </p>
    </div>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { widgetRegistry, type WidgetDef } from './registry';
import SettingsRenderer from './SettingsRenderer.vue';

const props = defineProps<{
  open: boolean;
  blockType: string;
  blockAttrs: Record<string, any>;
}>();

const emit = defineEmits(['close', 'update:attrs']);

const categoryColors: Record<string, string> = {
  layout: 'blue',
  content: 'green',
  media: 'purple',
  interactive: 'orange',
  commercial: 'gold',
  utility: 'cyan',
  social: 'magenta',
};

const widgetDef = computed<WidgetDef | undefined>(() =>
  widgetRegistry.find(w => w.type === props.blockType)
);

const drawerTitle = computed(() => {
  if (widgetDef.value) return `Edit: ${widgetDef.value.name}`;
  return 'Block Settings';
});

function handleAttrUpdate(key: string, value: any) {
  emit('update:attrs', key, value);
}
</script>

<style scoped>
.edit-settings-content {
  width: 100%;
}

.edit-settings-empty {
  text-align: center;
  padding: 40px 16px;
  color: #9ca3af;
  font-size: 14px;
}

.edit-settings-empty code {
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}
</style>
