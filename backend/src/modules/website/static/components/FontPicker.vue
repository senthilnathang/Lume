<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Type, Search, Check } from 'lucide-vue-next';
import { get } from '@/api/request';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const modalOpen = ref(false);
const activeTab = ref('custom');
const searchQuery = ref('');
const customFonts = ref<any[]>([]);
const googleFonts = ref<any[]>([]);
const loadingCustom = ref(false);
const loadingGoogle = ref(false);
const debounceTimer = ref<ReturnType<typeof setTimeout> | null>(null);

const PREVIEW_TEXT = 'The quick brown fox';

// Load custom fonts when modal opens
watch(modalOpen, async (isOpen) => {
  if (isOpen) {
    await loadCustomFonts();
  }
});

// Debounce Google Fonts search
watch(searchQuery, (val) => {
  if (activeTab.value !== 'google') return;
  if (debounceTimer.value) clearTimeout(debounceTimer.value);
  debounceTimer.value = setTimeout(() => {
    loadGoogleFonts(val);
  }, 400);
});

// Reload google fonts on tab switch
watch(activeTab, (tab) => {
  if (tab === 'google' && googleFonts.value.length === 0) {
    loadGoogleFonts('');
  }
});

async function loadCustomFonts() {
  loadingCustom.value = true;
  try {
    const data = await get<any[]>('/website/fonts');
    customFonts.value = Array.isArray(data) ? data : (data as any)?.data || [];
  } catch {
    customFonts.value = [];
  } finally {
    loadingCustom.value = false;
  }
}

async function loadGoogleFonts(query: string) {
  loadingGoogle.value = true;
  try {
    const data = await get<any[]>('/website/fonts/google-search', { q: query });
    googleFonts.value = Array.isArray(data) ? data : (data as any)?.data || [];
  } catch {
    googleFonts.value = [];
  } finally {
    loadingGoogle.value = false;
  }
}

function selectFont(family: string) {
  emit('update:modelValue', family);
  modalOpen.value = false;
}

const displayName = computed(() => props.modelValue || 'Select Font');

function openModal() {
  searchQuery.value = '';
  activeTab.value = 'custom';
  modalOpen.value = true;
}
</script>

<template>
  <div class="font-picker">
    <!-- Trigger button -->
    <button class="font-picker-trigger" @click="openModal">
      <Type :size="14" class="fp-icon" />
      <span class="fp-name" :style="modelValue ? { fontFamily: modelValue } : {}">
        {{ displayName }}
      </span>
      <span v-if="modelValue" class="fp-selected-check">
        <Check :size="12" />
      </span>
    </button>

    <!-- Font Picker Modal -->
    <a-modal
      v-model:open="modalOpen"
      title="Choose Font"
      :footer="null"
      width="560px"
      :destroy-on-close="true"
    >
      <a-tabs v-model:activeKey="activeTab" size="small">

        <!-- Custom Fonts Tab -->
        <a-tab-pane key="custom" tab="Custom Fonts">
          <div v-if="loadingCustom" class="fp-loading">
            <a-spin />
          </div>
          <div v-else-if="customFonts.length === 0" class="fp-empty">
            <a-empty description="No custom fonts uploaded yet" />
          </div>
          <div v-else class="fp-list">
            <div
              v-for="font in customFonts"
              :key="font.id"
              :class="['fp-item', modelValue === font.family && 'fp-item--active']"
              @click="selectFont(font.family)"
            >
              <div class="fp-item-info">
                <span class="fp-item-name" :style="{ fontFamily: font.family }">
                  {{ font.name }}
                </span>
                <span class="fp-item-meta">
                  {{ font.weight || 400 }} &middot; {{ font.style || 'normal' }}
                </span>
              </div>
              <div class="fp-item-preview" :style="{ fontFamily: font.family }">
                {{ PREVIEW_TEXT }}
              </div>
              <Check v-if="modelValue === font.family" :size="14" class="fp-check-icon" />
            </div>
          </div>
        </a-tab-pane>

        <!-- Google Fonts Tab -->
        <a-tab-pane key="google" tab="Google Fonts">
          <!-- Search input -->
          <div class="fp-search-bar">
            <a-input
              v-model:value="searchQuery"
              placeholder="Search Google Fonts..."
              :prefix="h => h(Search, { size: 14, style: 'color: #9ca3af' })"
              allow-clear
              size="small"
            />
          </div>

          <div v-if="loadingGoogle" class="fp-loading">
            <a-spin />
          </div>
          <div v-else-if="googleFonts.length === 0" class="fp-empty">
            <a-empty description="No fonts found" />
          </div>
          <div v-else class="fp-list">
            <div
              v-for="font in googleFonts"
              :key="font.family"
              :class="['fp-item', modelValue === font.family && 'fp-item--active']"
              @click="selectFont(font.family)"
            >
              <div class="fp-item-info">
                <span class="fp-item-name">{{ font.family }}</span>
                <span class="fp-item-meta">{{ font.category }}</span>
              </div>
              <div
                class="fp-item-preview"
                :style="{ fontFamily: `'${font.family}', sans-serif` }"
              >
                {{ PREVIEW_TEXT }}
              </div>
              <Check v-if="modelValue === font.family" :size="14" class="fp-check-icon" />
            </div>
          </div>
        </a-tab-pane>

      </a-tabs>
    </a-modal>
  </div>
</template>

<style scoped>
.font-picker {
  width: 100%;
}

.font-picker-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: #374151;
  text-align: left;
  transition: all 0.15s;
  min-height: 32px;
}

.font-picker-trigger:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.fp-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.fp-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fp-selected-check {
  color: #22c55e;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.fp-search-bar {
  margin-bottom: 12px;
}

.fp-loading {
  display: flex;
  justify-content: center;
  padding: 32px;
}

.fp-empty {
  padding: 24px 0;
}

.fp-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 360px;
  overflow-y: auto;
  padding-right: 4px;
}

.fp-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.fp-item:hover {
  border-color: #4096ff;
  background: #f0f5ff;
}

.fp-item--active {
  border-color: #4096ff;
  background: #e6f4ff;
}

.fp-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 130px;
  flex-shrink: 0;
}

.fp-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-item-meta {
  font-size: 11px;
  color: #9ca3af;
}

.fp-item-preview {
  flex: 1;
  font-size: 15px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fp-check-icon {
  color: #4096ff;
  flex-shrink: 0;
}
</style>
