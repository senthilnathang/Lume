<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'
import { GalleryHorizontal } from 'lucide-vue-next'

const props = defineProps(nodeViewProps)

const query = computed(() => {
  try { return JSON.parse(props.node.attrs.query || '{}') } catch { return {} }
})
const limit = computed(() => query.value.limit || 4)
const effect = computed(() => props.node.attrs.effect || 'slide')
const height = computed(() => props.node.attrs.height || 400)
</script>

<template>
  <NodeViewWrapper class="loop-carousel-block">
    <div class="loop-carousel-header">
      <GalleryHorizontal :size="16" />
      Loop Carousel ({{ effect }}, {{ limit }} items, source: {{ query.source || 'all' }})
    </div>
    <div class="loop-carousel-preview" :style="`height: ${Math.min(height, 200)}px`">
      <div v-for="i in Math.min(limit, 4)" :key="i" class="loop-carousel-card">
        <div class="carousel-card-img"></div>
        <div class="carousel-card-content">
          <div class="carousel-title-placeholder"></div>
          <div class="carousel-text-placeholder"></div>
        </div>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.loop-carousel-block {
  border: 2px dashed #f9a8d4;
  border-radius: 8px;
  padding: 12px;
  background: #fff0f6;
}
.loop-carousel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #db2777;
  margin-bottom: 10px;
}
.loop-carousel-preview {
  display: flex;
  gap: 12px;
  overflow: hidden;
}
.loop-carousel-card {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #fce7f3;
  flex: 0 0 220px;
}
.carousel-card-img {
  height: 120px;
  background: linear-gradient(135deg, #fce7f3, #fbcfe8);
}
.carousel-card-content {
  padding: 8px;
}
.carousel-title-placeholder {
  height: 12px;
  background: #f3f4f6;
  border-radius: 3px;
  margin-bottom: 6px;
  width: 70%;
}
.carousel-text-placeholder {
  height: 8px;
  background: #fce7f3;
  border-radius: 3px;
  width: 90%;
}
</style>
