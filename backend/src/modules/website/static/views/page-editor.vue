<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { Globe, ArrowLeft, Save, Check, Settings, Eye, Plus, Trash2, ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, ExternalLink, RefreshCw, Code, FormInput, Clock, Image as ImageIcon, CheckCircle2, AlertCircle, XCircle, BarChart2 } from 'lucide-vue-next';
import { get, put, post } from '@/api/request';
import { autoSavePage } from '../api/index';
import { PageBuilder } from '@modules/editor/static/components/index';
import RevisionHistoryDrawer from '../components/RevisionHistoryDrawer.vue';
import MediaPickerModal from '../components/MediaPickerModal.vue';

defineOptions({ name: 'WebsitePageEditor' });

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const saving = ref(false);
const publishing = ref(false);
const pageId = computed(() => route.query.id as string | undefined);

const pageTypes = ['page', 'landing', 'blog', 'home'];
const templates = ['default', 'full-width', 'sidebar', 'blank'];

const contentJson = ref<any>(null);
const contentHtml = ref('');

// Structured content editing
const structuredData = ref<any>(null);
const jsonEditMode = ref(false);        // true = raw JSON editor, false = form editor
const jsonEditText = ref('');
const jsonError = ref('');
const previewDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const iframeKey = ref(0);               // force iframe reload
const expandedSections = ref<Set<string>>(new Set());

// Revision history
const showRevisions = ref(false);

// Media picker
const showMediaPicker = ref(false);
const mediaPickerTarget = ref<string>('featuredImage'); // which field gets the picked URL

// Auto-save timer
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
const lastAutoSaveContent = ref<string>('');

const page = reactive({
  id: null as number | null,
  title: '',
  slug: '',
  content: '',
  contentHtml: '',
  excerpt: '',
  pageType: 'page',
  template: 'default',
  featuredImage: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  canonicalUrl: '',
  noIndex: false,
  noFollow: false,
  isPublished: false,
  customCss: '',
  headScripts: '',
  bodyScripts: '',
  // Phase 17: Scheduling
  publishAt: '' as string,
  expireAt: '' as string,
  // Phase 18: Access control
  visibility: 'public' as string,
  passwordHash: '' as string,
});

// Page locking
const lockStatus = ref<{ isLocked: boolean; lockedBy: number | null; lockedByName?: string } | null>(null);
const isLockedByOther = computed(() => lockStatus.value?.isLocked && lockStatus.value?.lockedBy !== null);
let lockPollTimer: ReturnType<typeof setInterval> | null = null;

async function acquireLock() {
  if (!pageId.value) return;
  try {
    await post(`/website/pages/${pageId.value}/lock`);
  } catch {
    // If 409, the page is locked by someone else — poll status
    await checkLockStatus();
  }
}

async function releaseLock() {
  if (!pageId.value) return;
  try { await post(`/website/pages/${pageId.value}/unlock`); } catch { /* ignore */ }
}

async function checkLockStatus() {
  if (!pageId.value) return;
  try {
    const data = await get(`/website/pages/${pageId.value}/lock`);
    lockStatus.value = data;
  } catch { /* ignore */ }
}

// Taxonomy: categories and tags
const allCategories = ref<any[]>([]);
const selectedCategories = ref<number[]>([]);
const allTags = ref<any[]>([]);
const selectedTagIds = ref<(number | string)[]>([]);
const tagOptions = ref<any[]>([]);

async function loadTaxonomy() {
  try {
    const [cats, tags] = await Promise.all([
      get('/website/categories'),
      get('/website/tags'),
    ]);
    allCategories.value = Array.isArray(cats) ? cats : cats?.rows || cats?.data || [];
    allTags.value = Array.isArray(tags) ? tags : tags?.rows || tags?.data || [];
    tagOptions.value = allTags.value.map((t: any) => ({ value: t.id, label: t.name }));
  } catch {
    // taxonomy optional
  }
}

// Handle tag change with create-on-enter support
// In mode="tags", new entries appear as string values; existing ones stay as number IDs
async function handleTagChange(values: (number | string)[]) {
  const resolved: number[] = [];
  for (const v of values) {
    if (typeof v === 'number') {
      resolved.push(v);
    } else {
      // Check if it matches an existing tag (case-insensitive)
      const existing = allTags.value.find((t: any) => t.name.toLowerCase() === String(v).toLowerCase());
      if (existing) {
        resolved.push(existing.id);
      } else {
        // Create new tag
        try {
          const slug = String(v).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
          const newTag = await post('/website/tags', { name: String(v), slug });
          if (newTag?.id) {
            allTags.value.push(newTag);
            tagOptions.value.push({ value: newTag.id, label: newTag.name });
            resolved.push(newTag.id);
          }
        } catch {
          // skip failed tag creation
        }
      }
    }
  }
  selectedTagIds.value = resolved;
}

async function loadPageTaxonomy(id: string) {
  try {
    const [pageCats, pageTags] = await Promise.all([
      get(`/website/pages/${id}/categories`).catch(() => []),
      get(`/website/pages/${id}/tags`).catch(() => []),
    ]);
    selectedCategories.value = (Array.isArray(pageCats) ? pageCats : []).map((c: any) => c.id ?? c.categoryId);
    selectedTagIds.value = (Array.isArray(pageTags) ? pageTags : []).map((t: any) => t.id ?? t.tagId);
  } catch {
    // optional
  }
}

async function saveTaxonomy(id: string) {
  try {
    await Promise.all([
      put(`/website/pages/${id}/categories`, { categoryIds: selectedCategories.value }),
      put(`/website/pages/${id}/tags`, { tagIds: selectedTagIds.value }),
    ]);
  } catch {
    // taxonomy save optional — don't block page save
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function onTitleInput() {
  if (!page.id) {
    page.slug = generateSlug(page.title);
  }
}

function onBlocksUpdate(json: any) {
  contentJson.value = json;
}

function onHtmlUpdate(html: string) {
  contentHtml.value = html;
}

function isJsonContent(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

// Detect if parsed content is TipTap format
function isTipTapJson(obj: any): boolean {
  return obj && typeof obj === 'object' && obj.type === 'doc' && Array.isArray(obj.content);
}

// Is the page content structured data (not TipTap)?
const isStructuredContent = computed(() => {
  if (!contentJson.value) return false;
  return !isTipTapJson(contentJson.value);
});

// Scheduled: publishAt is set and in the future and page is not yet published
const isScheduled = computed(() => {
  if (!page.publishAt || page.isPublished) return false;
  return new Date(page.publishAt) > new Date();
});

// Public site iframe URL
const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || 'http://localhost:3100';
const iframeUrl = computed(() => {
  if (!page.slug) return '';
  return page.slug === 'home' ? publicSiteUrl : `${publicSiteUrl}/${page.slug}`;
});

const iframeWidth = computed(() => {
  switch (previewDevice.value) {
    case 'tablet': return '768px';
    case 'mobile': return '375px';
    default: return '100%';
  }
});

// --- Structured content form helpers ---

function prettifyKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function toggleSection(key: string) {
  if (expandedSections.value.has(key)) {
    expandedSections.value.delete(key);
  } else {
    expandedSections.value.add(key);
  }
}

function isSectionExpanded(key: string): boolean {
  return expandedSections.value.has(key);
}

function addArrayItem(arr: any[], key: string) {
  if (!arr.length) {
    arr.push({});
    return;
  }
  // Clone structure from first item with empty values
  const template = arr[0];
  const newItem: any = {};
  for (const k of Object.keys(template)) {
    newItem[k] = typeof template[k] === 'string' ? '' : typeof template[k] === 'number' ? 0 : '';
  }
  arr.push(newItem);
}

function removeArrayItem(arr: any[], index: number) {
  arr.splice(index, 1);
}

function isLongValue(val: string): boolean {
  return val && val.length > 80;
}

function isSvgValue(val: string): boolean {
  return typeof val === 'string' && val.trim().startsWith('<svg');
}

// Sync structured data changes back to contentJson
function onStructuredDataChange() {
  contentJson.value = JSON.parse(JSON.stringify(structuredData.value));
}

// Switch to JSON edit mode
function enterJsonMode() {
  jsonEditText.value = JSON.stringify(structuredData.value, null, 2);
  jsonError.value = '';
  jsonEditMode.value = true;
}

// Apply JSON text changes back to structured data
function applyJsonChanges() {
  try {
    const parsed = JSON.parse(jsonEditText.value);
    structuredData.value = parsed;
    contentJson.value = parsed;
    jsonError.value = '';
    jsonEditMode.value = false;
    message.success('JSON applied');
  } catch (e: any) {
    jsonError.value = e.message;
  }
}

function cancelJsonMode() {
  jsonEditMode.value = false;
  jsonError.value = '';
}

function formatJson() {
  try {
    const parsed = JSON.parse(jsonEditText.value);
    jsonEditText.value = JSON.stringify(parsed, null, 2);
    jsonError.value = '';
  } catch (e: any) {
    jsonError.value = e.message;
  }
}

function refreshPreview() {
  iframeKey.value++;
}

// --- Data loading ---
async function loadPage() {
  if (!pageId.value) return;
  loading.value = true;
  try {
    const data = await get(`/website/pages/${pageId.value}`);
    let loadContent = data.content || '';
    if (isJsonContent(loadContent)) {
      try {
        const parsed = JSON.parse(loadContent);
        contentJson.value = parsed;
        // If structured content, set up the structured editor
        if (!isTipTapJson(parsed)) {
          structuredData.value = JSON.parse(JSON.stringify(parsed));
          // Auto-expand all top-level sections
          Object.keys(parsed).forEach(k => expandedSections.value.add(k));
        }
      } catch { /* keep as string */ }
    }

    Object.assign(page, {
      id: data.id,
      title: data.title || '',
      slug: data.slug || '',
      content: loadContent,
      contentHtml: data.contentHtml || '',
      excerpt: data.excerpt || '',
      pageType: data.pageType || 'page',
      template: data.template || 'default',
      featuredImage: data.featuredImage || '',
      metaTitle: data.metaTitle || '',
      metaDescription: data.metaDescription || '',
      metaKeywords: data.metaKeywords || '',
      ogTitle: data.ogTitle || '',
      ogDescription: data.ogDescription || '',
      ogImage: data.ogImage || '',
      canonicalUrl: data.canonicalUrl || '',
      noIndex: data.noIndex || false,
      noFollow: data.noFollow || false,
      isPublished: data.isPublished || false,
      customCss: data.customCss || '',
      headScripts: data.headScripts || '',
      bodyScripts: data.bodyScripts || '',
      publishAt: data.publishAt || '',
      expireAt: data.expireAt || '',
      visibility: data.visibility || 'public',
    });
    // Load taxonomy after page data
    if (data.id) await loadPageTaxonomy(String(data.id));
  } catch (err: any) {
    message.error('Failed to load page');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!page.title.trim()) {
    message.warning('Title is required');
    return;
  }
  saving.value = true;
  try {
    const payload = { ...page };
    delete (payload as any).id;
    delete (payload as any).isPublished;

    if (isStructuredContent.value && structuredData.value) {
      // Save structured content
      payload.content = JSON.stringify(structuredData.value);
      payload.contentHtml = '';
    } else if (contentJson.value) {
      // Save TipTap JSON content
      payload.content = JSON.stringify(contentJson.value);
      payload.contentHtml = contentHtml.value;
    } else {
      payload.contentHtml = payload.content;
    }

    if (page.id) {
      await put(`/website/pages/${page.id}`, payload);
      message.success('Page saved');
      // Refresh preview iframe after save
      if (isStructuredContent.value) {
        await nextTick();
        iframeKey.value++;
      }
      // Save taxonomy associations
      await saveTaxonomy(String(page.id));
    } else {
      const data = await post('/website/pages', payload);
      page.id = data.id;
      message.success('Page created');
      await saveTaxonomy(String(data.id));
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to save page');
  } finally {
    saving.value = false;
  }
}

async function handlePublishToggle() {
  if (!page.id) {
    message.warning('Save the page first');
    return;
  }
  publishing.value = true;
  try {
    if (page.isPublished) {
      await post(`/website/pages/${page.id}/unpublish`);
      page.isPublished = false;
      message.success('Page unpublished');
    } else {
      await post(`/website/pages/${page.id}/publish`);
      page.isPublished = true;
      message.success('Page published');
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to update publish status');
  } finally {
    publishing.value = false;
  }
}

function goBack() {
  router.push('/website/pages');
}

// Auto-save every 60s (only if content changed)
function startAutoSave() {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(async () => {
    if (!page.id) return;
    const currentContent = contentJson.value ? JSON.stringify(contentJson.value) : (structuredData.value ? JSON.stringify(structuredData.value) : '');
    if (!currentContent || currentContent === lastAutoSaveContent.value) return;

    try {
      await autoSavePage(page.id, {
        content: currentContent,
        contentHtml: contentHtml.value || '',
      });
      lastAutoSaveContent.value = currentContent;
    } catch { /* silent fail for autosave */ }
  }, 60000);
}

function onRevisionReverted(data: any) {
  // Reload the page after revert
  loadPage();
}

function openMediaPicker(target: string) {
  mediaPickerTarget.value = target;
  showMediaPicker.value = true;
}

function onMediaSelected(urls: string[]) {
  if (urls.length > 0) {
    if (mediaPickerTarget.value === 'featuredImage') {
      page.featuredImage = urls[0];
    } else if (mediaPickerTarget.value === 'ogImage') {
      page.ogImage = urls[0];
    }
  }
}

// SEO Analysis
const seoAnalysis = computed(() => {
  const checks: { label: string; status: 'good' | 'warn' | 'error'; detail?: string }[] = [];

  const title = page.metaTitle || page.title || '';
  const desc = page.metaDescription || '';
  const keyword = (page.metaKeywords || '').split(',')[0]?.trim().toLowerCase() || '';
  const slugVal = page.slug || '';

  // Extract text/headings/images from TipTap JSON
  let textContent = '';
  const headings: { level: number }[] = [];
  const images: { alt: string }[] = [];

  function walkNodes(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (node.type === 'text') textContent += (node.text || '') + ' ';
      if (node.type === 'heading') headings.push({ level: node.attrs?.level || 1 });
      if (node.type === 'imageBlock' || node.type === 'image') images.push({ alt: node.attrs?.alt || '' });
      if (node.content) walkNodes(node.content);
    }
  }
  if (contentJson.value) walkNodes(contentJson.value.content || []);
  const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

  // Title length
  const tLen = title.length;
  if (tLen === 0) checks.push({ label: 'Meta Title', status: 'error', detail: 'Missing' });
  else if (tLen < 30 || tLen > 70) checks.push({ label: 'Meta Title', status: 'warn', detail: `${tLen} chars (aim 50–60)` });
  else checks.push({ label: 'Meta Title', status: 'good', detail: `${tLen} chars` });

  // Description length
  const dLen = desc.length;
  if (dLen === 0) checks.push({ label: 'Meta Description', status: 'error', detail: 'Missing' });
  else if (dLen < 100 || dLen > 175) checks.push({ label: 'Meta Description', status: 'warn', detail: `${dLen} chars (aim 150–160)` });
  else checks.push({ label: 'Meta Description', status: 'good', detail: `${dLen} chars` });

  // Focus keyword
  if (keyword) {
    checks.push(title.toLowerCase().includes(keyword)
      ? { label: 'Keyword in title', status: 'good' }
      : { label: 'Keyword in title', status: 'warn', detail: 'Not found' });
    checks.push(desc.toLowerCase().includes(keyword)
      ? { label: 'Keyword in description', status: 'good' }
      : { label: 'Keyword in description', status: 'warn', detail: 'Not found' });
  }

  // Content length
  if (wordCount === 0) checks.push({ label: 'Content', status: 'warn', detail: 'No text content' });
  else if (wordCount < 300) checks.push({ label: 'Content', status: 'warn', detail: `${wordCount} words (aim 300+)` });
  else checks.push({ label: 'Content', status: 'good', detail: `${wordCount} words` });

  // H1
  const h1s = headings.filter(h => h.level === 1);
  if (h1s.length === 0) checks.push({ label: 'H1 Heading', status: 'warn', detail: 'None in content' });
  else if (h1s.length > 1) checks.push({ label: 'H1 Heading', status: 'warn', detail: `${h1s.length} H1s (use one)` });
  else checks.push({ label: 'H1 Heading', status: 'good', detail: '1 H1 found' });

  // Image alt text
  if (images.length > 0) {
    const missing = images.filter(i => !i.alt).length;
    checks.push(missing === 0
      ? { label: 'Image Alt Text', status: 'good', detail: `All ${images.length}` }
      : { label: 'Image Alt Text', status: 'warn', detail: `${missing}/${images.length} missing` });
  }

  // Slug length
  if (slugVal.length > 75) checks.push({ label: 'URL Slug', status: 'warn', detail: `${slugVal.length} chars` });
  else if (slugVal.length > 0) checks.push({ label: 'URL Slug', status: 'good', detail: `${slugVal.length} chars` });

  const score = checks.filter(c => c.status === 'good').length;
  return { checks, score, total: checks.length };
});

onMounted(async () => {
  await loadPage();
  loadTaxonomy();
  startAutoSave();
  if (pageId.value) {
    await acquireLock();
    // Poll lock status every 30s to detect if another user takes the lock
    lockPollTimer = setInterval(checkLockStatus, 30_000);
  }
});

onBeforeUnmount(async () => {
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  if (lockPollTimer) clearInterval(lockPollTimer);
  await releaseLock();
});

// Re-load when navigating between pages (same component, different query)
watch(pageId, (newId, oldId) => {
  if (newId !== oldId) {
    // Reset state
    contentJson.value = null;
    structuredData.value = null;
    expandedSections.value.clear();
    jsonEditMode.value = false;
    loadPage();
  }
});
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="bg-white border-b px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center gap-3">
        <a-button type="text" @click="goBack">
          <template #icon><ArrowLeft :size="18" /></template>
        </a-button>
        <div class="flex items-center gap-2">
          <Globe :size="20" class="text-blue-600" />
          <a-input
            v-model:value="page.title"
            placeholder="Page Title"
            :bordered="false"
            class="text-lg font-semibold"
            style="font-size: 18px; padding: 0;"
            @input="onTitleInput"
          />
        </div>
        <a-tag v-if="page.isPublished" color="green">Published</a-tag>
        <a-tag v-else-if="isScheduled" color="blue">Scheduled</a-tag>
        <a-tag v-else color="orange">Draft</a-tag>
      </div>
      <div class="flex items-center gap-2">
        <a-button v-if="page.id" @click="showRevisions = true" title="Revision History">
          <template #icon><Clock :size="16" /></template>
          History
        </a-button>
        <a-button v-if="page.slug" @click="router.push(`/website/pages/preview/${page.slug}?id=${page.id}`)">
          <template #icon><Eye :size="16" /></template>
          Preview
        </a-button>
        <a-button :loading="saving" @click="handleSave">
          <template #icon><Save :size="16" /></template>
          Save
        </a-button>
        <a-button
          :type="page.isPublished ? 'default' : 'primary'"
          :loading="publishing"
          @click="handlePublishToggle"
        >
          <template #icon><Check :size="16" /></template>
          {{ page.isPublished ? 'Unpublish' : 'Publish' }}
        </a-button>
      </div>
    </div>

    <!-- Page Lock Warning Banner -->
    <div
      v-if="isLockedByOther"
      class="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center gap-2 text-sm text-amber-800 flex-shrink-0"
    >
      <AlertCircle :size="16" class="text-amber-500 flex-shrink-0" />
      <span>This page is currently being edited by another user. Your changes may conflict. Editing is read-only until the lock is released.</span>
    </div>

    <!-- Content Area -->
    <a-spin :spinning="loading" class="flex-1">
      <div class="flex h-full" style="min-height: calc(100vh - 120px);">

        <!-- ====== STRUCTURED CONTENT EDITOR ====== -->
        <template v-if="isStructuredContent && structuredData">
          <!-- Left: Form/JSON editor -->
          <div class="structured-editor-panel">
            <div class="structured-editor-header">
              <div class="flex items-center gap-2">
                <FormInput :size="16" class="text-blue-600" />
                <span class="font-semibold text-gray-700">Page Data</span>
                <a-tag color="blue" size="small">Template Page</a-tag>
              </div>
              <div class="flex items-center gap-1">
                <a-button
                  v-if="!jsonEditMode"
                  size="small"
                  type="text"
                  @click="enterJsonMode"
                  title="Edit as JSON"
                >
                  <template #icon><Code :size="14" /></template>
                  JSON
                </a-button>
                <a-button
                  v-if="jsonEditMode"
                  size="small"
                  type="text"
                  @click="cancelJsonMode"
                >
                  <template #icon><FormInput :size="14" /></template>
                  Form
                </a-button>
              </div>
            </div>

            <!-- JSON Edit Mode -->
            <div v-if="jsonEditMode" class="json-editor-area">
              <div class="json-toolbar">
                <a-button size="small" @click="formatJson">Format</a-button>
                <a-button size="small" type="primary" @click="applyJsonChanges">Apply</a-button>
                <a-button size="small" @click="cancelJsonMode">Cancel</a-button>
              </div>
              <div v-if="jsonError" class="json-error">{{ jsonError }}</div>
              <textarea
                v-model="jsonEditText"
                class="json-textarea"
                spellcheck="false"
              />
            </div>

            <!-- Form Edit Mode -->
            <div v-else class="structured-form">
              <div
                v-for="(value, key) in structuredData"
                :key="key"
                class="data-section"
              >
                <!-- Section header (for arrays) -->
                <div
                  v-if="Array.isArray(value)"
                  class="section-header"
                  @click="toggleSection(String(key))"
                >
                  <component :is="isSectionExpanded(String(key)) ? ChevronDown : ChevronRight" :size="16" class="text-gray-400" />
                  <span class="section-title">{{ prettifyKey(String(key)) }}</span>
                  <a-tag size="small" color="default">{{ value.length }} items</a-tag>
                </div>

                <!-- Array items -->
                <div v-if="Array.isArray(value) && isSectionExpanded(String(key))" class="section-items">
                  <template v-for="(item, idx) in value" :key="idx">
                    <!-- Primitive array item (string/number) -->
                    <div v-if="typeof item === 'string' || typeof item === 'number'" class="primitive-item">
                      <span class="item-index">#{{ idx + 1 }}</span>
                      <a-input
                        :value="String(item)"
                        @update:value="(v: string) => { value[idx] = v; onStructuredDataChange(); }"
                        size="small"
                        class="flex-1"
                      />
                      <a-button
                        type="text"
                        size="small"
                        danger
                        @click="removeArrayItem(value, idx); onStructuredDataChange()"
                      >
                        <template #icon><Trash2 :size="12" /></template>
                      </a-button>
                    </div>
                    <!-- Object array item -->
                    <div v-else-if="typeof item === 'object' && item !== null" class="array-item">
                      <div class="array-item-header">
                        <span class="item-index">#{{ idx + 1 }}</span>
                        <span v-if="item.title || item.name || item.label" class="item-label">{{ item.title || item.name || item.label }}</span>
                        <a-button
                          type="text"
                          size="small"
                          danger
                          @click="removeArrayItem(value, idx); onStructuredDataChange()"
                        >
                          <template #icon><Trash2 :size="12" /></template>
                        </a-button>
                      </div>
                      <div class="array-item-fields">
                        <template v-for="(fieldVal, fieldKey) in item" :key="fieldKey">
                          <!-- SVG icon field — show as collapsed code -->
                          <div v-if="isSvgValue(fieldVal)" class="field-row">
                            <label class="field-label">{{ prettifyKey(String(fieldKey)) }}</label>
                            <a-textarea
                              :value="fieldVal"
                              @update:value="(v: string) => { item[fieldKey] = v; onStructuredDataChange(); }"
                              :rows="2"
                              class="field-code"
                              placeholder="<svg ...>"
                            />
                          </div>
                          <!-- Long text fields -->
                          <div v-else-if="typeof fieldVal === 'string' && isLongValue(fieldVal)" class="field-row">
                            <label class="field-label">{{ prettifyKey(String(fieldKey)) }}</label>
                            <a-textarea
                              :value="fieldVal"
                              @update:value="(v: string) => { item[fieldKey] = v; onStructuredDataChange(); }"
                              :rows="3"
                              placeholder=""
                            />
                          </div>
                          <!-- Nested array (e.g., tags) — show as comma-separated -->
                          <div v-else-if="Array.isArray(fieldVal)" class="field-row">
                            <label class="field-label">{{ prettifyKey(String(fieldKey)) }}</label>
                            <a-input
                              :value="fieldVal.join(', ')"
                              @update:value="(v: string) => { item[fieldKey] = v.split(',').map((s: string) => s.trim()).filter(Boolean); onStructuredDataChange(); }"
                              size="small"
                              placeholder="item1, item2, item3"
                            />
                          </div>
                          <!-- Number fields -->
                          <div v-else-if="typeof fieldVal === 'number'" class="field-row">
                            <label class="field-label">{{ prettifyKey(String(fieldKey)) }}</label>
                            <a-input-number
                              :value="fieldVal"
                              @update:value="(v: number) => { item[fieldKey] = v; onStructuredDataChange(); }"
                              size="small"
                              class="w-full"
                            />
                          </div>
                          <!-- Regular text fields -->
                          <div v-else-if="typeof fieldVal === 'string'" class="field-row">
                            <label class="field-label">{{ prettifyKey(String(fieldKey)) }}</label>
                            <a-input
                              :value="fieldVal"
                              @update:value="(v: string) => { item[fieldKey] = v; onStructuredDataChange(); }"
                              size="small"
                            />
                          </div>
                        </template>
                      </div>
                    </div>
                  </template>
                  <a-button
                    type="dashed"
                    size="small"
                    block
                    class="mt-2"
                    @click="addArrayItem(value, key as string); onStructuredDataChange()"
                  >
                    <template #icon><Plus :size="14" /></template>
                    Add {{ prettifyKey(String(key)).replace(/s$/, '') }}
                  </a-button>
                </div>

                <!-- Non-array fields (string/number) -->
                <div v-else-if="typeof value === 'string' || typeof value === 'number'" class="field-row top-field">
                  <label class="field-label">{{ prettifyKey(String(key)) }}</label>
                  <a-input
                    v-if="typeof value === 'string' && !isLongValue(value)"
                    :value="value"
                    @update:value="(v: string) => { structuredData[key] = v; onStructuredDataChange(); }"
                    size="small"
                  />
                  <a-textarea
                    v-else-if="typeof value === 'string'"
                    :value="value"
                    @update:value="(v: string) => { structuredData[key] = v; onStructuredDataChange(); }"
                    :rows="3"
                  />
                  <a-input-number
                    v-else
                    :value="value"
                    @update:value="(v: number) => { structuredData[key] = v; onStructuredDataChange(); }"
                    size="small"
                    class="w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Live preview iframe -->
          <div class="preview-panel">
            <div class="preview-panel-header">
              <span class="text-sm font-medium text-gray-600">Live Preview</span>
              <div class="flex items-center gap-2">
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
                <a-button size="small" type="text" @click="refreshPreview" title="Refresh">
                  <template #icon><RefreshCw :size="14" /></template>
                </a-button>
                <a :href="iframeUrl" target="_blank" class="preview-open-link" title="Open in new tab">
                  <ExternalLink :size="14" />
                </a>
              </div>
            </div>
            <div class="preview-iframe-wrapper">
              <div class="preview-iframe-container" :style="{ maxWidth: iframeWidth }">
                <iframe
                  :key="iframeKey"
                  :src="iframeUrl"
                  class="preview-iframe"
                  frameborder="0"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- ====== TIPTAP PAGE BUILDER (original) ====== -->
        <template v-else>
          <!-- Editor Panel -->
          <div class="flex-1 p-6 overflow-auto">
            <a-card title="Content" class="mb-4" :body-style="{ padding: 0 }">
              <PageBuilder
                v-model="page.content"
                placeholder="Start building your page..."
                min-height="500px"
                @update:blocks="onBlocksUpdate"
                @update:model-value="onHtmlUpdate"
              />
            </a-card>

            <a-card title="Excerpt" class="mb-4">
              <a-textarea
                v-model:value="page.excerpt"
                placeholder="Short description of the page"
                :rows="3"
              />
            </a-card>

            <a-card title="Custom CSS">
              <a-textarea
                v-model:value="page.customCss"
                placeholder="/* Custom CSS for this page */"
                :rows="6"
                style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
              />
            </a-card>

            <a-card title="Custom Code Injection" class="mt-4">
              <a-form layout="vertical">
                <a-form-item label="Head Scripts">
                  <a-textarea
                    v-model:value="page.headScripts"
                    placeholder="<!-- Scripts/styles injected into <head> -->"
                    :rows="4"
                    style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
                  />
                  <p class="text-xs text-gray-400 mt-1 m-0">Injected before &lt;/head&gt;</p>
                </a-form-item>
                <a-form-item label="Body Scripts">
                  <a-textarea
                    v-model:value="page.bodyScripts"
                    placeholder="<!-- Scripts injected before </body> -->"
                    :rows="4"
                    style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
                  />
                  <p class="text-xs text-gray-400 mt-1 m-0">Injected before &lt;/body&gt;</p>
                </a-form-item>
              </a-form>
            </a-card>
          </div>
        </template>

        <!-- Sidebar (always shown) -->
        <div class="w-72 border-l bg-gray-50 p-4 overflow-auto flex-shrink-0">
          <div class="flex items-center gap-2 mb-4">
            <Settings :size="16" class="text-gray-500" />
            <span class="font-medium text-gray-700">Page Settings</span>
          </div>

          <a-form layout="vertical" size="small">
            <a-form-item label="Slug">
              <a-input v-model:value="page.slug" placeholder="page-slug">
                <template #addonBefore>/</template>
              </a-input>
            </a-form-item>

            <a-form-item label="Page Type">
              <a-select v-model:value="page.pageType">
                <a-select-option v-for="pt in pageTypes" :key="pt" :value="pt">
                  {{ pt.charAt(0).toUpperCase() + pt.slice(1) }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Template">
              <a-select v-model:value="page.template">
                <a-select-option v-for="t in templates" :key="t" :value="t">
                  {{ t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ') }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Visibility">
              <a-select v-model:value="page.visibility">
                <a-select-option value="public">Public</a-select-option>
                <a-select-option value="private">Private (admin only)</a-select-option>
                <a-select-option value="password">Password Protected</a-select-option>
                <a-select-option value="members">Members Only</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item v-if="page.visibility === 'password'" label="Page Password">
              <a-input-password v-model:value="page.passwordHash" placeholder="Set access password" />
            </a-form-item>

            <a-form-item label="Schedule Publish">
              <a-input
                v-model:value="page.publishAt"
                type="datetime-local"
                placeholder="Schedule for future publish"
              />
              <p class="text-xs text-gray-400 mt-1 m-0">Leave empty to publish immediately when published.</p>
            </a-form-item>

            <a-form-item label="Expire At">
              <a-input
                v-model:value="page.expireAt"
                type="datetime-local"
                placeholder="Auto-revert to draft at this time"
              />
            </a-form-item>

            <a-form-item label="Featured Image">
              <div class="flex gap-2">
                <a-input v-model:value="page.featuredImage" placeholder="https://..." class="flex-1" />
                <a-button size="small" @click="openMediaPicker('featuredImage')">
                  <template #icon><ImageIcon :size="14" /></template>
                </a-button>
              </div>
              <div
                v-if="page.featuredImage"
                class="mt-2 rounded border overflow-hidden"
              >
                <img :src="page.featuredImage" alt="Featured" class="w-full h-32 object-cover" />
              </div>
            </a-form-item>

            <a-divider>Taxonomy</a-divider>

            <a-form-item label="Categories">
              <a-checkbox-group
                v-model:value="selectedCategories"
                class="flex flex-col gap-1"
              >
                <a-checkbox
                  v-for="cat in allCategories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </a-checkbox>
              </a-checkbox-group>
              <div v-if="!allCategories.length" class="text-xs text-gray-400">No categories yet</div>
            </a-form-item>

            <a-form-item label="Tags">
              <a-select
                v-model:value="selectedTagIds"
                mode="tags"
                placeholder="Select or type to create new tags"
                :options="tagOptions"
                :filter-option="(input: string, opt: any) => opt.label?.toLowerCase().includes(input.toLowerCase())"
                allow-clear
                @change="handleTagChange"
              />
              <div class="text-xs text-gray-400 mt-1">Press Enter to create a new tag</div>
            </a-form-item>

            <a-divider>SEO</a-divider>

            <a-form-item label="Meta Title">
              <a-input v-model:value="page.metaTitle" placeholder="Meta title" />
            </a-form-item>

            <a-form-item label="Meta Description">
              <a-textarea v-model:value="page.metaDescription" placeholder="Meta description" :rows="2" />
            </a-form-item>

            <a-form-item label="Meta Keywords">
              <a-input v-model:value="page.metaKeywords" placeholder="keyword1, keyword2" />
            </a-form-item>

            <a-form-item label="Canonical URL">
              <a-input v-model:value="page.canonicalUrl" placeholder="https://..." />
            </a-form-item>

            <a-divider>Open Graph</a-divider>

            <a-form-item label="OG Title">
              <a-input v-model:value="page.ogTitle" placeholder="OG title" />
            </a-form-item>

            <a-form-item label="OG Description">
              <a-textarea v-model:value="page.ogDescription" placeholder="OG description" :rows="2" />
            </a-form-item>

            <a-form-item label="OG Image">
              <div class="flex gap-2">
                <a-input v-model:value="page.ogImage" placeholder="https://..." class="flex-1" />
                <a-button size="small" @click="openMediaPicker('ogImage')">
                  <template #icon><ImageIcon :size="14" /></template>
                </a-button>
              </div>
            </a-form-item>

            <a-divider>Indexing</a-divider>

            <div class="flex gap-6">
              <a-form-item label="No Index">
                <a-switch v-model:checked="page.noIndex" size="small" />
              </a-form-item>
              <a-form-item label="No Follow">
                <a-switch v-model:checked="page.noFollow" size="small" />
              </a-form-item>
            </div>
          </a-form>

          <!-- SEO Analysis Panel -->
          <a-divider>
            <span class="flex items-center gap-1.5 text-xs"><BarChart2 :size="12" /> SEO Analysis</span>
          </a-divider>
          <div class="seo-analysis">
            <div class="seo-score-row">
              <span class="seo-score-label">Score: {{ seoAnalysis.score }}/{{ seoAnalysis.total }}</span>
              <div class="seo-score-track">
                <div
                  class="seo-score-fill"
                  :style="{
                    width: seoAnalysis.total ? `${Math.round(seoAnalysis.score / seoAnalysis.total * 100)}%` : '0%',
                    background: seoAnalysis.score / seoAnalysis.total > 0.7 ? '#52c41a'
                      : seoAnalysis.score / seoAnalysis.total > 0.4 ? '#faad14' : '#ff4d4f',
                  }"
                />
              </div>
            </div>
            <div class="seo-checks">
              <div v-for="chk in seoAnalysis.checks" :key="chk.label" class="seo-check-item">
                <CheckCircle2 v-if="chk.status === 'good'" :size="12" class="text-green-500 flex-shrink-0" />
                <AlertCircle v-else-if="chk.status === 'warn'" :size="12" class="text-yellow-500 flex-shrink-0" />
                <XCircle v-else :size="12" class="text-red-500 flex-shrink-0" />
                <div class="seo-check-content">
                  <span class="seo-check-name">{{ chk.label }}</span>
                  <span v-if="chk.detail" class="seo-check-detail">{{ chk.detail }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-spin>

    <!-- Revision History Drawer -->
    <RevisionHistoryDrawer
      v-model:open="showRevisions"
      :page-id="page.id"
      @reverted="onRevisionReverted"
    />

    <!-- Media Picker Modal -->
    <MediaPickerModal
      v-model:open="showMediaPicker"
      @select="onMediaSelected"
    />
  </div>
</template>

<style scoped>
:deep(.ant-input-borderless) {
  box-shadow: none !important;
}

/* SEO Analysis */
.seo-analysis {
  padding: 0 2px 12px;
}
.seo-score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.seo-score-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
.seo-score-track {
  flex: 1;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}
.seo-score-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background 0.3s ease;
}
.seo-checks {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.seo-check-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 4px;
  background: #f9fafb;
}
.seo-check-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.seo-check-name {
  font-size: 11px;
  font-weight: 500;
  color: #374151;
}
.seo-check-detail {
  font-size: 10px;
  color: #9ca3af;
}

/* Structured content editor */
.structured-editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  min-width: 380px;
  max-width: 480px;
  overflow: hidden;
}

.structured-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
  flex-shrink: 0;
}

.structured-form {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.data-section {
  margin-bottom: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}
.section-header:hover {
  background: #f3f4f6;
}

.section-title {
  font-weight: 600;
  font-size: 13px;
  color: #374151;
  flex: 1;
}

.section-items {
  padding: 8px 0 8px 8px;
}

.array-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 8px;
  background: #fff;
  overflow: hidden;
}

.array-item-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
}

.item-index {
  font-size: 11px;
  font-weight: 600;
  color: #9ca3af;
  min-width: 20px;
}

.item-label {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.array-item-fields {
  padding: 8px 10px;
}

.field-row {
  margin-bottom: 8px;
}

.field-row:last-child {
  margin-bottom: 0;
}

.top-field {
  padding: 8px 10px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 4px;
}

.field-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.field-code {
  font-family: 'SF Mono', Monaco, Menlo, monospace !important;
  font-size: 11px !important;
  color: #6b7280;
}

.primitive-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}

/* JSON editor */
.json-editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.json-toolbar {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.json-error {
  padding: 6px 12px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  font-family: monospace;
  border-bottom: 1px solid #fecaca;
}

.json-textarea {
  flex: 1;
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  padding: 12px;
  font-family: 'SF Mono', Monaco, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #1f2937;
  background: #fefefe;
}

/* Preview panel */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #f3f4f6;
}

.preview-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.preview-iframe-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
  overflow: hidden;
  padding: 0;
}

.preview-iframe-container {
  width: 100%;
  transition: max-width 0.3s ease;
  background: #fff;
  box-shadow: 0 0 0 1px #e5e7eb;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  min-height: calc(100vh - 170px);
  border: none;
  display: block;
}

.device-switcher {
  display: flex;
  align-items: center;
  gap: 2px;
  background: #f3f4f6;
  border-radius: 6px;
  padding: 2px;
}

.device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.device-btn:hover {
  color: #374151;
  background: #e5e7eb;
}

.device-btn.active {
  color: #1f2937;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.preview-open-link {
  display: flex;
  align-items: center;
  color: #9ca3af;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.preview-open-link:hover {
  color: #374151;
  background: #f3f4f6;
}
</style>
