<template>
  <node-view-wrapper
    class="lume-chart-block block-wrapper"
    :data-block-id="node.attrs.blockId"
  >
    <div class="chart-editor-preview" :style="{ height: node.attrs.height || '300px' }">
      <div class="chart-placeholder">
        <BarChart2 :size="48" class="text-blue-300" />
        <div class="chart-type-label">{{ node.attrs.chartType || 'bar' }} chart</div>
        <div class="chart-datasets-info">
          {{ parsedDatasets.length }} dataset(s) · {{ parsedLabels.length }} labels
        </div>
      </div>
    </div>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3';
import { BarChart2 } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);
const { node } = props;

const parsedLabels = computed(() => {
  try { return JSON.parse(node.attrs.labels || '[]'); } catch { return []; }
});

const parsedDatasets = computed(() => {
  try { return JSON.parse(node.attrs.datasets || '[]'); } catch { return []; }
});
</script>

<style scoped>
.chart-editor-preview {
  background: #f8faff;
  border: 2px dashed #bfdbfe;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.chart-placeholder {
  text-align: center;
  color: #93c5fd;
}
.chart-type-label {
  font-size: 13px;
  font-weight: 600;
  color: #60a5fa;
  margin-top: 8px;
  text-transform: capitalize;
}
.chart-datasets-info {
  font-size: 11px;
  color: #93c5fd;
  margin-top: 4px;
}
</style>
