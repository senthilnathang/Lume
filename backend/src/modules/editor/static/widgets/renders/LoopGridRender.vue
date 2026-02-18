<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const props = defineProps<{
  query?: string
  columns?: number
  gap?: number
  pagination?: boolean
}>()

const items = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const q = JSON.parse(props.query || '{}')
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(q).filter(([, v]) => v != null && v !== '').map(([k, v]) => [k, String(v)]))
    ).toString()
    const res = await fetch(`/api/website/public/query${params ? '?' + params : ''}`)
    const data = await res.json()
    items.value = data.data || []
  } catch (e) {
    // silently fail; items remains []
  } finally {
    loading.value = false
  }
})

const gridStyle = computed(() =>
  `display:grid;grid-template-columns:repeat(${props.columns || 3},1fr);gap:${props.gap || 24}px`
)
</script>

<template>
  <div v-if="loading" class="loop-grid-loading">Loading...</div>
  <div v-else-if="!items.length" class="loop-grid-empty">No items found.</div>
  <div v-else :style="gridStyle">
    <a
      v-for="item in items"
      :key="item.id"
      :href="'/' + item.slug"
      class="loop-grid-item"
    >
      <div v-if="item.featuredImage" class="item-thumb">
        <img :src="item.featuredImage" :alt="item.title" />
      </div>
      <div class="item-body">
        <h3>{{ item.title }}</h3>
        <p v-if="item.metaDescription">{{ item.metaDescription }}</p>
      </div>
    </a>
  </div>
</template>

<style scoped>
.loop-grid-loading,
.loop-grid-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
.loop-grid-item {
  display: block;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.2s;
}
.loop-grid-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.item-thumb img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}
.item-body {
  padding: 16px;
}
.item-body h3 {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.item-body p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
