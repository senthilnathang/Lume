<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps<{
  query?: string
  effect?: string
  autoplay?: boolean
  height?: number
  pagination?: boolean
}>()

const items = ref<any[]>([])
const loading = ref(true)
const current = ref(0)

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
    // silently fail
  } finally {
    loading.value = false
  }
})

function prev() {
  if (!items.value.length) return
  current.value = (current.value - 1 + items.value.length) % items.value.length
}

function next() {
  if (!items.value.length) return
  current.value = (current.value + 1) % items.value.length
}
</script>

<template>
  <div v-if="loading" class="loop-carousel-loading">Loading...</div>
  <div v-else-if="!items.length" class="loop-carousel-empty">No items found.</div>
  <div v-else class="loop-carousel-wrapper" :style="`height: ${height || 400}px`">
    <!-- Prev button -->
    <button class="carousel-btn carousel-btn--prev" @click="prev" aria-label="Previous">
      <ChevronLeft :size="20" />
    </button>

    <!-- Track -->
    <div class="loop-carousel-track">
      <a
        v-for="(item, idx) in items"
        :key="item.id"
        :href="'/' + item.slug"
        class="loop-carousel-card"
        :class="{ 'is-active': idx === current }"
      >
        <div v-if="item.featuredImage" class="carousel-item-thumb">
          <img :src="item.featuredImage" :alt="item.title" />
        </div>
        <div class="carousel-item-body">
          <h3>{{ item.title }}</h3>
          <p v-if="item.metaDescription">{{ item.metaDescription }}</p>
        </div>
      </a>
    </div>

    <!-- Next button -->
    <button class="carousel-btn carousel-btn--next" @click="next" aria-label="Next">
      <ChevronRight :size="20" />
    </button>

    <!-- Dots -->
    <div v-if="pagination" class="carousel-dots">
      <span
        v-for="(_, idx) in items"
        :key="idx"
        class="carousel-dot"
        :class="{ 'is-active': idx === current }"
        @click="current = idx"
      />
    </div>
  </div>
</template>

<style scoped>
.loop-carousel-loading,
.loop-carousel-empty {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
  font-size: 14px;
}
.loop-carousel-wrapper {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: #f9fafb;
}
.loop-carousel-track {
  display: flex;
  height: 100%;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  gap: 16px;
  padding: 0 48px;
  align-items: stretch;
}
.loop-carousel-track::-webkit-scrollbar {
  display: none;
}
.loop-carousel-card {
  flex: 0 0 280px;
  text-decoration: none;
  color: inherit;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s;
}
.loop-carousel-card:hover,
.loop-carousel-card.is-active {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-color: #a3b8ff;
}
.carousel-item-thumb img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  display: block;
}
.carousel-item-body {
  padding: 12px;
  flex: 1;
}
.carousel-item-body h3 {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.carousel-item-body p {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #374151;
  transition: background 0.2s, box-shadow 0.2s;
}
.carousel-btn:hover {
  background: #f3f4f6;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.carousel-btn--prev { left: 8px; }
.carousel-btn--next { right: 8px; }
.carousel-dots {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}
.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  cursor: pointer;
  transition: background 0.2s;
}
.carousel-dot.is-active {
  background: #4f6ef7;
}
</style>
