<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { ArrowLeftRight, Plus, Edit, Trash2 } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';

defineOptions({ name: 'WebsiteRedirects' });

const loading = ref(false);
const drawerVisible = ref(false);
const saving = ref(false);
const editingRedirect = ref<any>(null);
const redirects = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const form = reactive({
  sourcePath: '',
  targetPath: '',
  statusCode: 301,
  isActive: true,
});

const columns = [
  {
    title: 'Source Path',
    dataIndex: 'sourcePath',
    key: 'sourcePath',
    ellipsis: true,
  },
  {
    title: 'Target Path',
    dataIndex: 'targetPath',
    key: 'targetPath',
    ellipsis: true,
  },
  {
    title: 'Status Code',
    dataIndex: 'statusCode',
    key: 'statusCode',
    width: 120,
  },
  {
    title: 'Hits',
    dataIndex: 'hits',
    key: 'hits',
    width: 80,
  },
  {
    title: 'Active',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 80,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    align: 'right' as const,
  },
];

async function loadRedirects() {
  loading.value = true;
  try {
    const data = await get('/website/redirects', { params: { page: page.value, limit: pageSize.value } });
    redirects.value = data?.rows || data?.data || (Array.isArray(data) ? data : []);
    total.value = data?.total || redirects.value.length;
  } catch (err: any) {
    message.error('Failed to load redirects');
  } finally {
    loading.value = false;
  }
}

function openDrawer(redirect: any = null) {
  editingRedirect.value = redirect;
  if (redirect) {
    Object.assign(form, {
      sourcePath: redirect.sourcePath || '',
      targetPath: redirect.targetPath || '',
      statusCode: redirect.statusCode || 301,
      isActive: redirect.isActive !== false,
    });
  } else {
    Object.assign(form, {
      sourcePath: '',
      targetPath: '',
      statusCode: 301,
      isActive: true,
    });
  }
  drawerVisible.value = true;
}

function closeDrawer() {
  drawerVisible.value = false;
  editingRedirect.value = null;
}

async function handleSave() {
  if (!form.sourcePath.trim()) {
    message.warning('Source path is required');
    return;
  }
  if (!form.targetPath.trim()) {
    message.warning('Target path is required');
    return;
  }
  saving.value = true;
  try {
    if (editingRedirect.value) {
      await put(`/website/redirects/${editingRedirect.value.id}`, { ...form });
      message.success('Redirect updated');
    } else {
      await post('/website/redirects', { ...form });
      message.success('Redirect created');
    }
    closeDrawer();
    await loadRedirects();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save redirect');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(redirect: any) {
  try {
    await del(`/website/redirects/${redirect.id}`);
    message.success('Redirect deleted');
    await loadRedirects();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete redirect');
  }
}

async function toggleActive(redirect: any, value: boolean) {
  try {
    await put(`/website/redirects/${redirect.id}`, { isActive: value });
    redirect.isActive = value;
    message.success(value ? 'Redirect enabled' : 'Redirect disabled');
  } catch (err: any) {
    message.error('Failed to update redirect');
  }
}

function handlePageChange(p: number) {
  page.value = p;
  loadRedirects();
}

onMounted(() => {
  loadRedirects();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <ArrowLeftRight :size="20" class="text-blue-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">URL Redirects</h1>
          <p class="text-sm text-gray-500 m-0">Manage 301/302 URL redirects for your website</p>
        </div>
      </div>
      <a-button type="primary" @click="openDrawer()">
        <template #icon><Plus :size="16" /></template>
        Add Redirect
      </a-button>
    </div>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="redirects"
        :loading="loading"
        :pagination="{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: false,
          onChange: handlePageChange,
        }"
        row-key="id"
        size="middle"
      >
        <!-- Source Path -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sourcePath'">
            <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{{ record.sourcePath }}</code>
          </template>

          <!-- Target Path -->
          <template v-else-if="column.key === 'targetPath'">
            <code class="text-xs bg-gray-100 px-1 py-0.5 rounded">{{ record.targetPath }}</code>
          </template>

          <!-- Status Code badge -->
          <template v-else-if="column.key === 'statusCode'">
            <a-badge
              :status="record.statusCode === 301 ? 'success' : 'processing'"
              :text="record.statusCode === 301 ? '301 Permanent' : '302 Temporary'"
            />
          </template>

          <!-- Hits -->
          <template v-else-if="column.key === 'hits'">
            <span class="text-gray-600">{{ record.hits || 0 }}</span>
          </template>

          <!-- Active toggle -->
          <template v-else-if="column.key === 'isActive'">
            <a-switch
              :checked="record.isActive"
              size="small"
              @change="(val: boolean) => toggleActive(record, val)"
            />
          </template>

          <!-- Actions -->
          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center justify-end gap-1">
              <a-tooltip title="Edit">
                <a-button type="text" size="small" @click="openDrawer(record)">
                  <template #icon><Edit :size="14" /></template>
                </a-button>
              </a-tooltip>
              <a-popconfirm
                title="Delete this redirect?"
                ok-text="Delete"
                ok-type="danger"
                @confirm="handleDelete(record)"
              >
                <a-tooltip title="Delete">
                  <a-button type="text" size="small" danger>
                    <template #icon><Trash2 :size="14" /></template>
                  </a-button>
                </a-tooltip>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Drawer -->
    <a-drawer
      :open="drawerVisible"
      :title="editingRedirect ? 'Edit Redirect' : 'Add Redirect'"
      width="480"
      @close="closeDrawer"
    >
      <a-form layout="vertical">
        <a-form-item label="Source Path" required>
          <a-input
            v-model:value="form.sourcePath"
            placeholder="/old-page-url"
          />
          <div class="text-xs text-gray-400 mt-1">
            The original URL path to redirect from (e.g. /old-page)
          </div>
        </a-form-item>

        <a-form-item label="Target Path" required>
          <a-input
            v-model:value="form.targetPath"
            placeholder="/new-page-url or https://example.com"
          />
          <div class="text-xs text-gray-400 mt-1">
            The destination URL to redirect to
          </div>
        </a-form-item>

        <a-form-item label="Status Code">
          <a-select v-model:value="form.statusCode">
            <a-select-option :value="301">301 — Permanent Redirect</a-select-option>
            <a-select-option :value="302">302 — Temporary Redirect</a-select-option>
          </a-select>
          <div class="text-xs text-gray-400 mt-1">
            Use 301 for permanent moves (better for SEO), 302 for temporary ones
          </div>
        </a-form-item>

        <a-form-item label="Active">
          <a-switch v-model:checked="form.isActive" />
          <span class="ml-2 text-sm text-gray-500">
            {{ form.isActive ? 'Redirect is active' : 'Redirect is disabled' }}
          </span>
        </a-form-item>
      </a-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="closeDrawer">Cancel</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            {{ editingRedirect ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>
