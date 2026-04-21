<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { get } from '@/api/request'

interface SearchResult {
  id: number
  title: string
  description: string
  model: string
  group: string
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
}

const ROUTE_MAP: Record<string, string> = {
  activities: '/activities',
  donations: '/donations',
  donors: '/donations/donors',
  user: '/settings/users',
  team_members: '/team',
  documents: '/documents',
  messages: '/messages',
  campaigns: '/donations/campaigns',
}

const RECENT_KEY = 'lume_recent_searches'
const MAX_RECENT = 5

const router = useRouter()
const visible = ref(false)
const query = ref('')
const loading = ref(false)
const results = ref<SearchResult[]>([])
const activeIndex = ref(-1)
const inputRef = ref<InstanceType<any> | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const recentSearches = ref<string[]>(loadRecent())

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecent(term: string) {
  const trimmed = term.trim()
  if (!trimmed) return
  const list = recentSearches.value.filter((s) => s !== trimmed)
  list.unshift(trimmed)
  recentSearches.value = list.slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches.value))
}

function removeRecent(term: string) {
  recentSearches.value = recentSearches.value.filter((s) => s !== term)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recentSearches.value))
}

const groupedResults = computed(() => {
  const groups: Record<string, SearchResult[]> = {}
  for (const item of results.value) {
    if (!groups[item.group]) groups[item.group] = []
    groups[item.group].push(item)
  }
  return groups
})

const flatResults = computed(() => results.value)

const showRecent = computed(() => !query.value.trim() && recentSearches.value.length > 0)

function open() {
  visible.value = true
  query.value = ''
  results.value = []
  activeIndex.value = -1
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function close() {
  visible.value = false
  query.value = ''
  results.value = []
  activeIndex.value = -1
}

async function performSearch(term: string) {
  const trimmed = term.trim()
  if (!trimmed) {
    results.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data: SearchResponse = await get(`/search?q=${encodeURIComponent(trimmed)}&limit=20`)
    results.value = data.results
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

watch(query, (val) => {
  activeIndex.value = -1
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => performSearch(val), 300)
})

function getRoute(result: SearchResult): string {
  const base = ROUTE_MAP[result.model] ?? `/${result.model}`
  return `${base}/${result.id}`
}

function navigateTo(result: SearchResult) {
  saveRecent(query.value)
  close()
  router.push(getRoute(result))
}

function selectRecentSearch(term: string) {
  query.value = term
}

function onKeydown(e: KeyboardEvent) {
  const total = flatResults.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = total > 0 ? (activeIndex.value + 1) % total : -1
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = total > 0 ? (activeIndex.value - 1 + total) % total : -1
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (activeIndex.value >= 0 && activeIndex.value < total) {
      navigateTo(flatResults.value[activeIndex.value])
    }
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    if (visible.value) {
      close()
    } else {
      open()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onGlobalKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})

defineExpose({ open })
</script>

<template>
  <a-modal
    :open="visible"
    :footer="null"
    :closable="false"
    :mask-closable="true"
    :destroy-on-close="true"
    :width="640"
    wrap-class-name="command-palette-modal"
    @cancel="close"
  >
    <div class="flex flex-col max-h-[480px]">
      <!-- Search input -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <svg
          class="w-5 h-5 text-gray-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <a-input
          ref="inputRef"
          v-model:value="query"
          placeholder="Search activities, people, documents..."
          :bordered="false"
          size="large"
          class="flex-1 command-palette-input"
          @keydown="onKeydown"
        />
        <kbd
          class="hidden sm:inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 rounded border border-gray-200"
        >
          ESC
        </kbd>
      </div>

      <!-- Content area -->
      <div class="overflow-y-auto flex-1 px-2 py-2">
        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12">
          <a-spin />
        </div>

        <!-- Recent searches (when input is empty) -->
        <div v-else-if="showRecent">
          <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Recent Searches
          </div>
          <div
            v-for="term in recentSearches"
            :key="term"
            class="flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-gray-50 group"
            @click="selectRecentSearch(term)"
          >
            <div class="flex items-center gap-2 text-sm text-gray-600">
              <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ term }}
            </div>
            <button
              class="text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="removeRecent(term)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading && query.trim() && results.length === 0" class="py-12">
          <a-empty :description="`No results for &quot;${query}&quot;`" />
        </div>

        <!-- Grouped results -->
        <template v-else>
          <div v-for="(items, group) in groupedResults" :key="group" class="mb-2">
            <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {{ group }}
            </div>
            <div
              v-for="item in items"
              :key="item.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors"
              :class="{
                'bg-blue-50': flatResults.indexOf(item) === activeIndex,
                'hover:bg-gray-50': flatResults.indexOf(item) !== activeIndex,
              }"
              @click="navigateTo(item)"
              @mouseenter="activeIndex = flatResults.indexOf(item)"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">{{ item.title }}</div>
                <div v-if="item.description" class="text-xs text-gray-500 truncate mt-0.5">
                  {{ item.description }}
                </div>
              </div>
              <a-tag class="shrink-0" color="blue">{{ item.group }}</a-tag>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer hint -->
      <div
        v-if="results.length > 0"
        class="flex items-center gap-4 px-4 py-2 border-t border-gray-200 text-xs text-gray-400"
      >
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">&#8593;</kbd>
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">&#8595;</kbd>
          to navigate
        </span>
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">&#9166;</kbd>
          to open
        </span>
        <span class="flex items-center gap-1">
          <kbd class="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200 font-mono">esc</kbd>
          to close
        </span>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
:deep(.command-palette-input .ant-input) {
  font-size: 16px;
  padding: 0;
}

:deep(.command-palette-input .ant-input:focus) {
  box-shadow: none;
}
</style>

<style>
.command-palette-modal .ant-modal-content {
  padding: 0 !important;
  border-radius: 12px;
  overflow: hidden;
}

.command-palette-modal .ant-modal-body {
  padding: 0 !important;
}

.command-palette-modal .ant-modal {
  top: 20%;
}
</style>
