<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { Globe, ArrowLeft, Save, Check, Settings } from 'lucide-vue-next';
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

async function loadPage() {
  if (!pageId.value) return;
  loading.value = true;
  try {
    const data = await get(`/website/pages/${pageId.value}`);
    Object.assign(page, {
      id: data.id,
      title: data.title || '',
      slug: data.slug || '',
      content: data.content || '',
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
    payload.contentHtml = payload.content;

    if (page.id) {
      await put(`/website/pages/${page.id}`, payload);
      message.success('Page saved');
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
        <!-- Editor Panel -->
        <div class="flex-1 p-6 overflow-auto">
          <a-card title="Content" class="mb-4" :body-style="{ padding: 0 }">
            <PageBuilder
              v-model="page.content"
              placeholder="Start building your page..."
              min-height="500px"
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

        <!-- Sidebar -->
        <div class="w-80 border-l bg-gray-50 p-4 overflow-auto flex-shrink-0">
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
</style>
