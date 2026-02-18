<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'
import { LayoutGrid } from 'lucide-vue-next'

const props = defineProps(nodeViewProps)

const query = computed(() => {
  try { return JSON.parse(props.node.attrs.query || '{}') } catch { return {} }
})
const cols = computed(() => props.node.attrs.columns || 3)
const limit = computed(() => query.value.limit || 6)
</script>

<template>
  <NodeViewWrapper class="loop-grid-block">
    <div class="loop-grid-header">
      <LayoutGrid :size="16" />
      Loop Grid ({{ cols }} cols, {{ limit }} items, source: {{ query.source || 'all' }})
    </div>
    <div class="loop-grid-preview" :style="`grid-template-columns: repeat(${cols}, 1fr)`">
      <div v-for="i in Math.min(limit, 6)" :key="i" class="loop-grid-card">
        <div class="card-img-placeholder"></div>
        <div class="card-content">
          <div class="card-title-placeholder"></div>
          <div class="card-text-placeholder"></div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.loop-grid-block {
  border: 2px dashed #a3b8ff;
  border-radius: 8px;
  padding: 12px;
  background: #f0f4ff;
}
.loop-grid-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #4f6ef7;
  margin-bottom: 10px;
}
.loop-grid-preview {
  display: grid;
  gap: 12px;
}
.loop-grid-card {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}
.card-img-placeholder {
  height: 100px;
  background: linear-gradient(135deg, #e0e7ff, #c7d2fe);
}
.card-content {
  padding: 8px;
}
.card-title-placeholder {
  height: 12px;
  background: #e5e7eb;
  border-radius: 3px;
  margin-bottom: 6px;
  width: 70%;
}
.card-text-placeholder {
  height: 8px;
  background: #f3f4f6;
  border-radius: 3px;
  width: 90%;
}
</style>
