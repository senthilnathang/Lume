<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3';

const props = defineProps(nodeViewProps);

const columnStyles = computed(() => ({
  width: props.node.attrs.width || undefined,
  flex: props.node.attrs.width ? 'none' : '1',
}));
</script>

<template>
  <NodeViewWrapper class="column-block" :style="columnStyles" data-type="columnBlock">
    <NodeViewContent class="column-content" />
  </NodeViewWrapper>
</template>

<style scoped>
.column-block {
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
  padding: 12px;
  min-height: 60px;
  transition: border-color 0.15s;
}
.column-block:hover {
  border-color: #93c5fd;
}
.column-content {
  min-height: 40px;
}
</style>
