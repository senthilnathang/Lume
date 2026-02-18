<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { Globe, FileText, Plus, Edit, Trash2, Search, Check, X, RefreshCw, Eye, Clock } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';
import { CompactEditor } from '@modules/editor/static/components/index';

defineOptions({ name: 'WebsitePages' });

const router = useRouter();
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

const categoryFilter = ref<number | null>(null);
const tagFilter = ref<number | null>(null);
const allCategories = ref<any[]>([]);
const allTags = ref<any[]>([]);

const stats = computed(() => {
  const total = pages.value.length;
  const published = pages.value.filter((p: any) => p.isPublished).length;
  const scheduled = pages.value.filter((p: any) => !p.isPublished && p.publishAt && new Date(p.publishAt) > new Date()).length;
  const drafts = total - published - scheduled;
  return { total, published, drafts, scheduled };
});

// Client-side filtering for search, status, type (immediate feedback)
// Category/tag filters trigger a fresh API load (server-side)
const filteredPages = computed(() => {
  return pages.value.filter((page: any) => {
    const matchesSearch = !searchText.value ||
      page.title?.toLowerCase().includes(searchText.value.toLowerCase()) ||
      page.slug?.toLowerCase().includes(searchText.value.toLowerCase());
    const isScheduled = !page.isPublished && page.publishAt && new Date(page.publishAt) > new Date();
    const matchesStatus = !statusFilter.value ||
      (statusFilter.value === 'published' && page.isPublished) ||
      (statusFilter.value === 'draft' && !page.isPublished && !isScheduled) ||
      (statusFilter.value === 'scheduled' && isScheduled);
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
    const params: Record<string, any> = { limit: 200 };
    if (categoryFilter.value) params.categoryId = categoryFilter.value;
    if (tagFilter.value) params.tagId = tagFilter.value;
    const data = await get('/website/pages', { params });
    pages.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
  } catch (err: any) {
    message.error('Failed to load pages');
  } finally {
    loading.value = false;
  }
}

async function loadTaxonomy() {
  try {
    const [cats, tags] = await Promise.all([
      get('/website/categories').catch(() => []),
      get('/website/tags').catch(() => []),
    ]);
    allCategories.value = Array.isArray(cats) ? cats : cats?.rows || cats?.data || [];
    allTags.value = Array.isArray(tags) ? tags : tags?.rows || tags?.data || [];
  } catch { /* taxonomy optional */ }
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

function editPage(page: any) {
  router.push(`/website/pages/editor?id=${page.id}`);
}

function openDrawer(page: any = null) {
  editingPage.value = null;
  resetForm();
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
    const data = await post('/website/pages', payload);
    message.success('Page created — opening editor');
    closeDrawer();
    router.push(`/website/pages/editor?id=${data.id}`);
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

watch([categoryFilter, tagFilter], () => {
  loadPages();
});

onMounted(() => {
  loadPages();
  loadTaxonomy();
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
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
      <a-card size="small">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 m-0">Scheduled</p>
            <p class="text-2xl font-semibold m-0 text-blue-600">{{ stats.scheduled }}</p>
          </div>
          <Clock :size="24" class="text-blue-400" />
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
          <a-select-option value="scheduled">Scheduled</a-select-option>
        </a-select>
        <a-select
          v-model:value="typeFilter"
          placeholder="All Types"
          style="width: 130px"
          allow-clear
        >
          <a-select-option v-for="pt in pageTypes" :key="pt" :value="pt">
            {{ pt.charAt(0).toUpperCase() + pt.slice(1) }}
          </a-select-option>
        </a-select>
        <a-select
          v-if="allCategories.length"
          v-model:value="categoryFilter"
          placeholder="All Categories"
          style="width: 160px"
          allow-clear
        >
          <a-select-option v-for="cat in allCategories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </a-select-option>
        </a-select>
        <a-select
          v-if="allTags.length"
          v-model:value="tagFilter"
          placeholder="All Tags"
          style="width: 140px"
          allow-clear
        >
          <a-select-option v-for="tag in allTags" :key="tag.id" :value="tag.id">
            {{ tag.name }}
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
            <a class="font-medium text-blue-600 hover:text-blue-800 cursor-pointer" @click="editPage(record)">{{ record.title }}</a>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag v-if="record.isPublished" color="green">Published</a-tag>
            <a-tag v-else-if="record.publishAt && new Date(record.publishAt) > new Date()" color="blue">
              Scheduled
            </a-tag>
            <a-tag v-else color="orange">Draft</a-tag>
          </template>
          <template v-else-if="column.key === 'created'">
            {{ formatDate(record.created_at) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="actions-cell flex items-center gap-1">
              <a-tooltip title="Preview">
                <a-button type="text" size="small" @click="router.push(`/website/pages/preview/${record.slug}?id=${record.id}`)">
                  <template #icon><Eye :size="15" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="editPage(record)">
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

    <!-- Create New Page Drawer -->
    <a-drawer
      :open="drawerVisible"
      title="New Page"
      width="480"
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
      </a-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="closeDrawer">Cancel</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            Create
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
