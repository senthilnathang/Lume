<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { Globe, ArrowLeft, Save, Check, Settings, Eye, Plus, Trash2, ChevronDown, ChevronRight, Monitor, Tablet, Smartphone, ExternalLink, RefreshCw, Code, FormInput } from 'lucide-vue-next';
import { get, put, post } from '@/api/request';
import { PageBuilder } from '@modules/editor/static/components/index';

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
});

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

// Public site iframe URL
const publicSiteUrl = 'http://localhost:3100';
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
    });
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
    } else {
      const data = await post('/website/pages', payload);
      page.id = data.id;
      message.success('Page created');
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

onMounted(() => {
  loadPage();
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
        <a-tag v-else color="orange">Draft</a-tag>
      </div>
      <div class="flex items-center gap-2">
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

            <a-form-item label="Featured Image">
              <a-input v-model:value="page.featuredImage" placeholder="https://..." />
              <div
                v-if="page.featuredImage"
                class="mt-2 rounded border overflow-hidden"
              >
                <img :src="page.featuredImage" alt="Featured" class="w-full h-32 object-cover" />
              </div>
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
              <a-input v-model:value="page.ogImage" placeholder="https://..." />
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
        </div>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
:deep(.ant-input-borderless) {
  box-shadow: none !important;
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
