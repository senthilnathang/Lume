<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="max-w-4xl mx-auto px-4 py-20">
      <div class="animate-pulse space-y-6">
        <div class="h-10 bg-gray-200 rounded w-2/3"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded w-4/6"></div>
        <div class="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>

    <!-- 404 -->
    <div v-else-if="error || !page" class="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 class="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p class="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
      <NuxtLink
        to="/"
        class="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
      >
        Back to Home
      </NuxtLink>
    </div>

    <!-- Page Content -->
    <div v-else :class="{ 'pt-12': editActive }" :style="editActive ? 'transition: padding-top 0.3s ease' : ''">
      <!-- Page Header (skip for landing pages) -->
      <div v-if="page.pageType !== 'landing'" class="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="max-w-3xl">
            <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Home</NuxtLink>
              <span>/</span>
              <span class="text-gray-700">{{ page.title }}</span>
            </nav>
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">{{ page.title }}</h1>
            <p v-if="page.excerpt" class="mt-3 text-lg text-gray-600">{{ page.excerpt }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div :class="contentWrapperClass" :style="editActive && settingsPanelOpen ? 'margin-right: 340px; transition: margin-right 0.3s ease' : ''">
        <PageRenderer
          :page="page"
          :editMode="editActive"
          :editContent="editActive ? currentContent : undefined"
          @update:content="handleContentUpdate"
          @select-block="handleBlockSelect"
          @insert-block="handleInsertBlock"
        />
      </div>
    </div>

    <!-- Edit mode components -->
    <ClientOnly>
      <BuilderEditModeToggle v-if="isTipTapPage" @enter-edit="handleEnterEdit" />
      <BuilderOverlay />
      <BuilderWidgetSettingsPanel
        :key="editVersion"
        :visible="settingsPanelOpen"
        :block="selectedBlock"
        :blockType="selectedBlockType"
        @close="clearSelection"
        @update:attr="handleAttrUpdate"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';

const route = useRoute();
const slug = computed(() => {
  const params = route.params.slug;
  if (Array.isArray(params)) return params.join('/');
  return params || '';
});

const { page, seo, pending, error } = usePageContent(slug.value);
const { isAdmin } = useAuth();
const {
  active: editActive,
  currentContent,
  selectedBlockPath,
  version: editVersion,
  enterEditMode,
  updateContent,
  updateBlockAttrs,
  selectBlock,
  clearSelection,
  getBlockAtPath,
} = useEditMode();

// SEO meta tags
useHead({ title: () => seo.value.title || undefined });
useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,
  ogTitle: () => seo.value.ogTitle,
  ogDescription: () => seo.value.ogDescription,
  ogImage: () => seo.value.ogImage || undefined,
});

// Content wrapper class based on page template
const contentWrapperClass = computed(() => {
  const template = page.value?.template || 'default';
  switch (template) {
    case 'full-width': return 'w-full';
    case 'blank': return '';
    case 'sidebar': return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
    default: return 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
  }
});

// Detect if this page uses TipTap JSON content (editable)
const isTipTapPage = computed(() => {
  if (!page.value?.content) return false;
  try {
    const parsed = typeof page.value.content === 'string'
      ? JSON.parse(page.value.content)
      : page.value.content;
    return parsed && (parsed.type === 'doc' || Array.isArray(parsed));
  } catch {
    return false;
  }
});

// Selected block state
const selectedBlock = computed(() => {
  if (!editActive.value || !selectedBlockPath.value.length) return null;
  return getBlockAtPath(selectedBlockPath.value);
});

const selectedBlockType = computed(() => selectedBlock.value?.type || '');
const settingsPanelOpen = computed(() => editActive.value && selectedBlockPath.value.length > 0);

// Handlers
function handleEnterEdit() {
  if (!page.value) return;
  const content = typeof page.value.content === 'string'
    ? JSON.parse(page.value.content)
    : page.value.content;
  enterEditMode(page.value.id, content);
}

function handleContentUpdate(newContent: any) {
  updateContent(newContent);
}

function handleBlockSelect(path: number[]) {
  selectBlock(path);
}

function handleAttrUpdate(key: string, value: any) {
  if (selectedBlockPath.value.length) {
    updateBlockAttrs(selectedBlockPath.value, key, value);
  }
}

function handleInsertBlock(path: number[], position: string) {
  // For now, show a notification — full widget picker is a future enhancement
  console.log('Insert block at', path, position);
}
</script>
