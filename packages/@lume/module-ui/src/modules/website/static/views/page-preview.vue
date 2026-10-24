<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { Pencil, ArrowLeft, Eye, Save, X, MousePointerClick, ExternalLink, Monitor, Tablet, Smartphone } from 'lucide-vue-next';
import { getPageBySlug, getPage, updatePage } from '../api/index';
import BlockRenderer from '@modules/editor/static/widgets/BlockRenderer.vue';
import EditableBlockRenderer from '@modules/editor/static/widgets/EditableBlockRenderer.vue';
import WidgetPickerModal from '@modules/editor/static/widgets/WidgetPickerModal.vue';
import EditSettingsDrawer from '@modules/editor/static/widgets/EditSettingsDrawer.vue';
import { widgetRegistry } from '@modules/editor/static/widgets/registry';

defineOptions({ name: 'WebsitePagePreview' });

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const pageData = ref<any>(null);
const notFound = ref(false);

// Edit mode state
const editMode = ref(false);
const editContent = ref<any>(null);
const isDirty = ref(false);
const saving = ref(false);
const selectedBlockPath = ref<number[]>([]);
const widgetPickerOpen = ref(false);
const settingsDrawerOpen = ref(false);
const insertPath = ref<number[]>([]);
const insertPosition = ref<'before' | 'after'>('after');

const slug = computed(() => (route.params.slug as string) || '');
const pageId = computed(() => route.query.id as string | undefined);

// Parse content
const pageContent = computed(() => {
  if (!pageData.value?.content) return null;
  const raw = pageData.value.content;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return JSON.parse(trimmed); } catch { return null; }
    }
    return null;
  }
  return raw;
});

const isHtmlContent = computed(() => {
  if (!pageData.value?.content) return false;
  return !pageContent.value;
});

// Detect if content is TipTap JSON (has type: "doc") vs structured page data
const isTipTapContent = computed(() => {
  const content = pageContent.value;
  if (!content || typeof content !== 'object') return false;
  return content.type === 'doc' && Array.isArray(content.content);
});

// Structured content = valid JSON but NOT TipTap format (e.g., home page with heroStats, productCategories)
const isStructuredContent = computed(() => {
  return pageContent.value && !isTipTapContent.value && !isHtmlContent.value;
});

// Public site URL for iframe preview of structured pages
const publicSiteUrl = computed(() => {
  return import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3100';
});

const iframeUrl = computed(() => {
  if (!pageData.value?.slug) return '';
  const slug = pageData.value.slug;
  return slug === 'home' ? publicSiteUrl.value : `${publicSiteUrl.value}/${slug}`;
});

// Responsive preview device
const previewDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const iframeWidth = computed(() => {
  switch (previewDevice.value) {
    case 'tablet': return '768px';
    case 'mobile': return '375px';
    default: return '100%';
  }
});

// The content to render — editContent in edit mode, pageContent otherwise
const displayContent = computed(() => {
  if (editMode.value && editContent.value) return editContent.value;
  return pageContent.value;
});

// Selected block info for settings drawer
const selectedBlock = computed(() => {
  if (!selectedBlockPath.value.length || !editContent.value) return null;
  try {
    return getBlockAtPath(editContent.value, selectedBlockPath.value);
  } catch {
    return null;
  }
});

const selectedBlockType = computed(() => selectedBlock.value?.type || '');
const selectedBlockAttrs = computed(() => selectedBlock.value?.attrs || {});

// --- Content manipulation helpers ---
function getBlockAtPath(docObj: any, path: number[]): any {
  let node = docObj;
  for (const idx of path) {
    node = (node.content || [])[idx];
  }
  return node;
}

function createBlockFromType(type: string): any {
  const def = widgetRegistry.find(w => w.type === type);
  if (!def) return { type, attrs: {} };
  return { type, attrs: { ...def.defaults } };
}

// --- Edit mode controls ---
function enterEditMode() {
  if (!pageContent.value) {
    message.warning('Cannot enter edit mode: no JSON content to edit');
    return;
  }
  editContent.value = JSON.parse(JSON.stringify(pageContent.value));
  editMode.value = true;
  isDirty.value = false;
  selectedBlockPath.value = [];
}

function exitEditMode() {
  if (isDirty.value) {
    // Confirm discard
    if (!confirm('You have unsaved changes. Discard them?')) return;
  }
  editMode.value = false;
  editContent.value = null;
  isDirty.value = false;
  selectedBlockPath.value = [];
  settingsDrawerOpen.value = false;
}

async function saveChanges() {
  if (!pageData.value?.id || !editContent.value) return;
  saving.value = true;
  try {
    const contentToSave = typeof pageData.value.content === 'string'
      ? JSON.stringify(editContent.value)
      : editContent.value;
    await updatePage(pageData.value.id, { content: contentToSave });
    // Update local page data
    pageData.value.content = contentToSave;
    isDirty.value = false;
    message.success('Page saved successfully');
  } catch (err: any) {
    message.error('Failed to save page');
  } finally {
    saving.value = false;
  }
}

// --- Event handlers from EditableBlockRenderer ---
function handleContentUpdate(newContent: any) {
  editContent.value = newContent;
  isDirty.value = true;
}

function handleSelectBlock(path: number[]) {
  selectedBlockPath.value = path;
  if (path.length > 0) {
    settingsDrawerOpen.value = true;
  }
}

function handleInsertBlock(path: number[], position: 'before' | 'after') {
  insertPath.value = path;
  insertPosition.value = position;
  widgetPickerOpen.value = true;
}

function handleWidgetSelect(widgetType: string) {
  if (!editContent.value) return;
  const block = createBlockFromType(widgetType);
  const docObj = editContent.value;
  const path = insertPath.value;

  if (path.length === 0) {
    // Insert at beginning
    if (!docObj.content) docObj.content = [];
    docObj.content.unshift(block);
  } else {
    const parent = path.length > 1 ? getBlockAtPath(docObj, path.slice(0, -1)) : docObj;
    const idx = path[path.length - 1];
    const insertIdx = insertPosition.value === 'after' ? idx + 1 : idx;
    if (!parent.content) parent.content = [];
    parent.content.splice(insertIdx, 0, block);
  }

  editContent.value = JSON.parse(JSON.stringify(docObj));
  isDirty.value = true;
  widgetPickerOpen.value = false;
}

function handleAttrUpdate(key: string, value: any) {
  if (!selectedBlock.value || !editContent.value) return;
  const block = getBlockAtPath(editContent.value, selectedBlockPath.value);
  if (!block) return;
  if (!block.attrs) block.attrs = {};
  block.attrs[key] = value;
  editContent.value = JSON.parse(JSON.stringify(editContent.value));
  isDirty.value = true;
}

function handleSettingsClose() {
  settingsDrawerOpen.value = false;
}

function handleMarkDirty() {
  isDirty.value = true;
}

// --- Data loading ---
async function loadPage() {
  loading.value = true;
  notFound.value = false;
  try {
    let data;
    if (pageId.value) {
      data = await getPage(Number(pageId.value));
    } else if (slug.value) {
      data = await getPageBySlug(slug.value);
    } else {
      notFound.value = true;
      return;
    }
    pageData.value = data;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      notFound.value = true;
    } else {
      message.error('Failed to load page');
    }
  } finally {
    loading.value = false;
  }
}

function goToEditor() {
  if (pageData.value?.id) {
    router.push(`/website/pages/editor?id=${pageData.value.id}`);
  }
}

function goBack() {
  router.push('/website/pages');
}

onMounted(loadPage);
watch(() => [slug.value, pageId.value], loadPage);
</script>

<template>
  <div class="page-preview-container">
    <!-- Admin toolbar (floating) -->
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <a-button type="text" size="small" @click="goBack">
          <template #icon><ArrowLeft :size="16" /></template>
        </a-button>
        <div class="toolbar-divider" />
        <Eye :size="16" class="text-gray-400" />
        <span class="toolbar-title">{{ editMode ? 'Edit Mode' : 'Preview' }}</span>
        <a-tag v-if="pageData?.isPublished" color="green" size="small">Published</a-tag>
        <a-tag v-else-if="pageData" color="orange" size="small">Draft</a-tag>
        <a-tag v-if="editMode && isDirty" color="red" size="small">Unsaved</a-tag>
      </div>
      <div class="toolbar-right">
        <span v-if="pageData && !editMode" class="toolbar-slug text-gray-400">/{{ pageData.slug }}</span>

        <!-- Edit mode controls -->
        <template v-if="editMode">
          <a-button size="small" @click="exitEditMode" :disabled="saving">
            <template #icon><X :size="14" /></template>
            Discard
          </a-button>
          <a-button
            type="primary"
            size="small"
            :loading="saving"
            :disabled="!isDirty"
            @click="saveChanges"
          >
            <template #icon><Save :size="14" /></template>
            Save
          </a-button>
        </template>

        <!-- Normal mode controls -->
        <template v-else>
          <!-- Device switcher for iframe preview -->
          <template v-if="isStructuredContent">
            <div class="device-switcher">
              <button :class="['device-btn', previewDevice === 'desktop' && 'active']" @click="previewDevice = 'desktop'" title="Desktop">
                <Monitor :size="14" />
              </button>
              <button :class="['device-btn', previewDevice === 'tablet' && 'active']" @click="previewDevice = 'tablet'" title="Tablet">
                <Tablet :size="14" />
              </button>
              <button :class="['device-btn', previewDevice === 'mobile' && 'active']" @click="previewDevice = 'mobile'" title="Mobile">
                <Smartphone :size="14" />
              </button>
            </div>
            <a :href="iframeUrl" target="_blank" class="toolbar-link">
              <ExternalLink :size="14" />
              Open Site
            </a>
          </template>
          <a-button
            v-if="isTipTapContent"
            size="small"
            @click="enterEditMode"
          >
            <template #icon><MousePointerClick :size="14" /></template>
            Live Edit
          </a-button>
          <a-button type="primary" size="small" @click="goToEditor" :disabled="!pageData?.id">
            <template #icon><Pencil :size="14" /></template>
            Edit Page
          </a-button>
        </template>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="preview-loading">
      <a-spin size="large" />
    </div>

    <!-- Not found -->
    <div v-else-if="notFound" class="preview-empty">
      <h2>Page Not Found</h2>
      <p>The page you're looking for doesn't exist or isn't published.</p>
      <a-button @click="goBack">Back to Pages</a-button>
    </div>

    <!-- Page content -->
    <div v-else-if="pageData" class="preview-content">
      <!-- SEO meta (visible in preview, hidden in edit mode) -->
      <div v-if="!editMode && (pageData.metaTitle || pageData.metaDescription)" class="preview-seo-bar">
        <div class="seo-preview">
          <div class="seo-title">{{ pageData.metaTitle || pageData.title }}</div>
          <div class="seo-url">example.com/{{ pageData.slug }}</div>
          <div class="seo-desc">{{ pageData.metaDescription || pageData.excerpt || 'No description' }}</div>
        </div>
      </div>

      <!-- Custom CSS -->
      <component v-if="pageData.customCss" :is="'style'" v-text="pageData.customCss" />

      <!-- Structured content: show public site in iframe -->
      <div v-if="isStructuredContent && !editMode" class="iframe-preview-wrapper">
        <div class="iframe-container" :style="{ maxWidth: iframeWidth }">
          <iframe
            :src="iframeUrl"
            class="preview-iframe"
            frameborder="0"
            allowfullscreen
          />
        </div>
      </div>

      <!-- Rendered page (TipTap content) -->
      <article v-else :class="['page-article', editMode ? 'page-article-edit' : '']">
        <!-- Edit mode: EditableBlockRenderer -->
        <EditableBlockRenderer
          v-if="editMode && displayContent"
          :content="displayContent"
          :editMode="true"
          @update:content="handleContentUpdate"
          @select-block="handleSelectBlock"
          @insert-block="handleInsertBlock"
          @move-block="handleMarkDirty"
          @delete-block="handleMarkDirty"
          @duplicate-block="handleMarkDirty"
        />

        <!-- Preview mode: standard BlockRenderer -->
        <BlockRenderer v-else-if="isTipTapContent" :content="pageContent" />

        <!-- HTML fallback -->
        <div v-else-if="isHtmlContent" class="html-content" v-html="pageData.contentHtml || pageData.content" />

        <!-- Empty -->
        <div v-else class="preview-empty-content">
          <p>This page has no content yet.</p>
        </div>
      </article>
    </div>

    <!-- Widget Picker Modal -->
    <WidgetPickerModal
      :open="widgetPickerOpen"
      @close="widgetPickerOpen = false"
      @select="handleWidgetSelect"
    />

    <!-- Edit Settings Drawer -->
    <EditSettingsDrawer
      :open="settingsDrawerOpen && editMode"
      :blockType="selectedBlockType"
      :blockAttrs="selectedBlockAttrs"
      @close="handleSettingsClose"
      @update:attrs="handleAttrUpdate"
    />
  </div>
</template>

<style scoped>
.page-preview-container {
  min-height: 100vh;
  background: #fff;
}

.preview-toolbar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #1f2937;
  color: #fff;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #4b5563;
}

.toolbar-title {
  font-weight: 600;
  color: #d1d5db;
}

.toolbar-slug {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}

.preview-toolbar :deep(.ant-btn-text) {
  color: #d1d5db;
}
.preview-toolbar :deep(.ant-btn-text:hover) {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.preview-empty {
  text-align: center;
  padding: 80px 24px;
  color: #6b7280;
}
.preview-empty h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.preview-seo-bar {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 16px 24px;
}

.seo-preview {
  max-width: 600px;
  margin: 0 auto;
}

.seo-title {
  font-size: 18px;
  color: #1a0dab;
  font-weight: 400;
  line-height: 1.3;
  cursor: pointer;
}
.seo-title:hover { text-decoration: underline; }

.seo-url {
  font-size: 13px;
  color: #006621;
  margin-top: 2px;
}

.seo-desc {
  font-size: 13px;
  color: #545454;
  margin-top: 2px;
  line-height: 1.4;
}

.page-article {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
}

.page-article-edit {
  max-width: 1200px;
  padding: 48px 24px 80px;
}

.html-content {
  line-height: 1.7;
  font-size: 16px;
  color: #1f2937;
}

.preview-empty-content {
  text-align: center;
  padding: 60px;
  color: #9ca3af;
  font-size: 16px;
}

/* Iframe preview for structured content pages */
.iframe-preview-wrapper {
  display: flex;
  justify-content: center;
  background: #f3f4f6;
  min-height: calc(100vh - 42px);
  padding: 0;
}

.iframe-container {
  width: 100%;
  transition: max-width 0.3s ease;
  background: #fff;
  box-shadow: 0 0 0 1px #e5e7eb;
}

.preview-iframe {
  width: 100%;
  height: calc(100vh - 42px);
  border: none;
  display: block;
}

/* Device switcher */
.device-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
}

.device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.device-btn:hover {
  color: #d1d5db;
  background: rgba(255, 255, 255, 0.1);
}

.device-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.toolbar-link {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.toolbar-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
</style>
