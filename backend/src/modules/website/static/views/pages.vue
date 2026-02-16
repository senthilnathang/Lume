<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { Globe, FileText, Plus, Edit, Trash2, Search, Check, X, RefreshCw } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';
import { CompactEditor } from '@modules/editor/static/components/index';

defineOptions({ name: 'WebsitePages' });

const loading = ref(false);
const saving = ref(false);
const drawerVisible = ref(false);
const editingPage = ref<any>(null);
const pages = ref<any[]>([]);
const searchText = ref('');
const statusFilter = ref<string | null>(null);
const typeFilter = ref<string | null>(null);

const pageTypes = ['page', 'landing', 'blog', 'home'];
const templates = ['default', 'full-width', 'sidebar', 'blank'];

const formState = reactive({
  title: '',
  slug: '',
  content: '',
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
  noIndex: false,
  noFollow: false,
});

const columns = [
  { title: 'Title', key: 'title', ellipsis: true },
  { title: 'Slug', dataIndex: 'slug', key: 'slug', width: 180, ellipsis: true },
  { title: 'Type', dataIndex: 'pageType', key: 'pageType', width: 100 },
  { title: 'Status', key: 'status', width: 110 },
  { title: 'Created', key: 'created', width: 120 },
  { title: 'Actions', key: 'actions', width: 160, fixed: 'right' },
];

const stats = computed(() => {
  const total = pages.value.length;
  const published = pages.value.filter((p: any) => p.isPublished).length;
  const drafts = total - published;
  return { total, published, drafts };
});

const filteredPages = computed(() => {
  return pages.value.filter((page: any) => {
    const matchesSearch = !searchText.value ||
      page.title?.toLowerCase().includes(searchText.value.toLowerCase()) ||
      page.slug?.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesStatus = !statusFilter.value ||
      (statusFilter.value === 'published' && page.isPublished) ||
      (statusFilter.value === 'draft' && !page.isPublished);
    const matchesType = !typeFilter.value || page.pageType === typeFilter.value;
    return matchesSearch && matchesStatus && matchesType;
  });
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function onTitleChange() {
  if (!editingPage.value) {
    formState.slug = generateSlug(formState.title);
  }
}

function formatDate(date: string) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

async function loadPages() {
  loading.value = true;
  try {
    const data = await get('/website/pages');
    pages.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
  } catch (err: any) {
    message.error('Failed to load pages');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(formState, {
    title: '',
    slug: '',
    content: '',
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
    noIndex: false,
    noFollow: false,
  });
}

function openDrawer(page: any = null) {
  editingPage.value = page;
  if (page) {
    Object.assign(formState, {
      title: page.title || '',
      slug: page.slug || '',
      content: page.content || '',
      excerpt: page.excerpt || '',
      pageType: page.pageType || 'page',
      template: page.template || 'default',
      featuredImage: page.featuredImage || '',
      metaTitle: page.metaTitle || '',
      metaDescription: page.metaDescription || '',
      metaKeywords: page.metaKeywords || '',
      ogTitle: page.ogTitle || '',
      ogDescription: page.ogDescription || '',
      ogImage: page.ogImage || '',
      noIndex: page.noIndex || false,
      noFollow: page.noFollow || false,
    });
  } else {
    resetForm();
  }
  drawerVisible.value = true;
}

function closeDrawer() {
  drawerVisible.value = false;
  editingPage.value = null;
}

async function handleSave() {
  if (!formState.title.trim()) {
    message.warning('Title is required');
    return;
  }
  if (!formState.slug.trim()) {
    message.warning('Slug is required');
    return;
  }

  saving.value = true;
  try {
    const payload = { ...formState };
    if (editingPage.value) {
      await put(`/website/pages/${editingPage.value.id}`, payload);
      message.success('Page updated successfully');
    } else {
      await post('/website/pages', payload);
      message.success('Page created successfully');
    }
    closeDrawer();
    await loadPages();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save page');
  } finally {
    saving.value = false;
  }
}

async function togglePublish(page: any) {
  try {
    if (page.isPublished) {
      await post(`/website/pages/${page.id}/unpublish`);
      message.success('Page unpublished');
    } else {
      await post(`/website/pages/${page.id}/publish`);
      message.success('Page published');
    }
    await loadPages();
  } catch (err: any) {
    message.error(err?.message || 'Failed to update publish status');
  }
}

async function handleDelete(page: any) {
  try {
    await del(`/website/pages/${page.id}`);
    message.success('Page deleted successfully');
    await loadPages();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete page');
  }
}

onMounted(() => {
  loadPages();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <Globe :size="20" class="text-blue-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Pages</h1>
          <p class="text-sm text-gray-500 m-0">Manage website pages and content</p>
        </div>
      </div>
      <a-button type="primary" @click="openDrawer()">
        <template #icon><Plus :size="16" /></template>
        New Page
      </a-button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <a-card size="small">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 m-0">Total Pages</p>
            <p class="text-2xl font-semibold m-0">{{ stats.total }}</p>
          </div>
          <FileText :size="24" class="text-gray-400" />
        </div>
      </a-card>
      <a-card size="small">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 m-0">Published</p>
            <p class="text-2xl font-semibold m-0 text-green-600">{{ stats.published }}</p>
          </div>
          <Check :size="24" class="text-green-400" />
        </div>
      </a-card>
      <a-card size="small">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 m-0">Drafts</p>
            <p class="text-2xl font-semibold m-0 text-orange-600">{{ stats.drafts }}</p>
          </div>
          <Edit :size="24" class="text-orange-400" />
        </div>
      </a-card>
    </div>

    <!-- Filter Bar & Table -->
    <a-card>
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <a-input
          v-model:value="searchText"
          placeholder="Search pages..."
          style="width: 260px"
          allow-clear
        >
          <template #prefix><Search :size="16" class="text-gray-400" /></template>
        </a-input>
        <a-select
          v-model:value="statusFilter"
          placeholder="All Status"
          style="width: 150px"
          allow-clear
        >
          <a-select-option value="published">Published</a-select-option>
          <a-select-option value="draft">Draft</a-select-option>
        </a-select>
        <a-select
          v-model:value="typeFilter"
          placeholder="All Types"
          style="width: 150px"
          allow-clear
        >
          <a-select-option v-for="pt in pageTypes" :key="pt" :value="pt">
            {{ pt.charAt(0).toUpperCase() + pt.slice(1) }}
          </a-select-option>
        </a-select>
        <a-tooltip title="Refresh">
          <a-button @click="loadPages">
            <template #icon><RefreshCw :size="16" /></template>
          </a-button>
        </a-tooltip>
      </div>

      <a-table
        :data-source="filteredPages"
        :columns="columns"
        :loading="loading"
        :row-key="(r: any) => r.id"
        :pagination="{ pageSize: 15, showSizeChanger: true, showTotal: (t: number) => `${t} pages` }"
        :scroll="{ x: 800 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div class="font-medium">{{ record.title }}</div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.isPublished ? 'green' : 'orange'">
              {{ record.isPublished ? 'Published' : 'Draft' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'created'">
            {{ formatDate(record.created_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><Edit :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip :title="record.isPublished ? 'Unpublish' : 'Publish'">
                <a-button type="text" size="small" @click="togglePublish(record)">
                  <template #icon>
                    <component :is="record.isPublished ? X : Check" :size="15" />
                  </template>
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="Delete this page?"
                ok-text="Delete"
                ok-type="danger"
                @confirm="handleDelete(record)"
              >
                <a-tooltip title="Delete">
                  <a-button type="text" size="small" danger>
                    <template #icon><Trash2 :size="15" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      :open="drawerVisible"
      :title="editingPage ? 'Edit Page' : 'New Page'"
      width="640"
      @close="closeDrawer"
    >
      <a-form layout="vertical">
        <a-form-item label="Title" required>
          <a-input v-model:value="formState.title" placeholder="Page title" @input="onTitleChange" />
        </a-form-item>
        <a-form-item label="Slug" required>
          <a-input v-model:value="formState.slug" placeholder="page-slug">
            <template #addonBefore>/</template>
          </a-input>
        </a-form-item>
        <a-form-item label="Content">
          <CompactEditor v-model="formState.content" placeholder="Write page content..." min-height="180px" />
        </a-form-item>
        <a-form-item label="Excerpt">
          <a-textarea v-model:value="formState.excerpt" placeholder="Short description" :rows="2" />
        </a-form-item>

        <div class="grid grid-cols-2 gap-4">
          <a-form-item label="Page Type">
            <a-select v-model:value="formState.pageType">
              <a-select-option v-for="pt in pageTypes" :key="pt" :value="pt">
                {{ pt.charAt(0).toUpperCase() + pt.slice(1) }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Template">
            <a-select v-model:value="formState.template">
              <a-select-option v-for="t in templates" :key="t" :value="t">
                {{ t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ') }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </div>

        <a-form-item label="Featured Image URL">
          <a-input v-model:value="formState.featuredImage" placeholder="https://..." />
        </a-form-item>

        <!-- SEO Section -->
        <a-card title="SEO Settings" size="small" class="mb-4">
          <a-form-item label="Meta Title">
            <a-input v-model:value="formState.metaTitle" placeholder="Meta title" />
          </a-form-item>
          <a-form-item label="Meta Description">
            <a-textarea v-model:value="formState.metaDescription" placeholder="Meta description" :rows="2" />
          </a-form-item>
          <a-form-item label="Meta Keywords">
            <a-input v-model:value="formState.metaKeywords" placeholder="keyword1, keyword2, ..." />
          </a-form-item>
          <a-form-item label="OG Title">
            <a-input v-model:value="formState.ogTitle" placeholder="Open Graph title" />
          </a-form-item>
          <a-form-item label="OG Description">
            <a-textarea v-model:value="formState.ogDescription" placeholder="Open Graph description" :rows="2" />
          </a-form-item>
          <a-form-item label="OG Image">
            <a-input v-model:value="formState.ogImage" placeholder="https://..." />
          </a-form-item>
          <div class="flex gap-6">
            <a-form-item label="No Index">
              <a-switch v-model:checked="formState.noIndex" />
            </a-form-item>
            <a-form-item label="No Follow">
              <a-switch v-model:checked="formState.noFollow" />
            </a-form-item>
          </div>
        </a-card>
      </a-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="closeDrawer">Cancel</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            {{ editingPage ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
