<template>
  <div class="page-renderer">
    <!-- Edit mode: use EditableBlockRenderer -->
    <template v-if="editMode && editContent">
      <EditableBlockRenderer
        :content="editContent"
        :editMode="true"
        @update:content="$emit('update:content', $event)"
        @select-block="$emit('select-block', $event)"
        @insert-block="$emit('insert-block', $event)"
      />
    </template>

    <!-- Read-only: TipTap JSON content -->
    <template v-else-if="doc">
      <BlockRenderer :content="doc" />
    </template>

    <!-- Fallback: pre-rendered HTML -->
    <template v-else-if="page?.contentHtml">
      <div class="lume-page-content" v-html="page.contentHtml" />
    </template>

    <!-- Empty -->
    <template v-else>
      <div class="text-center py-20 text-gray-400">
        <p>This page has no content yet.</p>
      </div>
    </template>

    <!-- Inject page custom CSS if present -->
    <component v-if="page?.customCss" :is="'style'" v-text="page.customCss" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BlockRenderer from '@widgets/BlockRenderer.vue';
import EditableBlockRenderer from '@widgets/EditableBlockRenderer.vue';

const props = defineProps<{
  page: {
    content?: string | null;
    contentHtml?: string | null;
    customCss?: string | null;
  } | null;
  editMode?: boolean;
  editContent?: any;
}>();

defineEmits(['update:content', 'select-block', 'insert-block']);

const doc = computed(() => {
  if (!props.page?.content) return null;
  try {
    const parsed = typeof props.page.content === 'string'
      ? JSON.parse(props.page.content)
      : props.page.content;
    // Valid TipTap doc must have type: 'doc' or be an array of nodes
    if (parsed && (parsed.type === 'doc' || Array.isArray(parsed))) return parsed;
    return null;
  } catch {
    return null;
  }
});
</script>
