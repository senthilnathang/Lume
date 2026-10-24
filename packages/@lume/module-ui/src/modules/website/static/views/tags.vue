<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { Hash, Plus, Pencil, Trash2 } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';

defineOptions({ name: 'WebsiteTags' });

const loading = ref(false);
const saving = ref(false);
const tags = ref<any[]>([]);
const searchQuery = ref('');
const drawerOpen = ref(false);
const isEditing = ref(false);

const form = reactive({ name: '', slug: '' });
const editingId = ref<number | null>(null);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Slug', dataIndex: 'slug', key: 'slug' },
  { title: 'Actions', key: 'actions', width: 100 },
];

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function onNameInput() {
  if (!isEditing.value) form.slug = generateSlug(form.name);
}

async function loadTags() {
  loading.value = true;
  try {
    const data = await get('/website/tags', { params: { search: searchQuery.value || undefined } });
    tags.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
  } catch {
    message.error('Failed to load tags');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.slug = '';
  drawerOpen.value = true;
}

function openEdit(tag: any) {
  isEditing.value = true;
  editingId.value = tag.id;
  form.name = tag.name || '';
  form.slug = tag.slug || '';
  drawerOpen.value = true;
}

async function handleSave() {
  if (!form.name.trim()) { message.warning('Name is required'); return; }
  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await put(`/website/tags/${editingId.value}`, { ...form });
      message.success('Tag updated');
    } else {
      await post('/website/tags', { ...form });
      message.success('Tag created');
    }
    drawerOpen.value = false;
    await loadTags();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save tag');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await del(`/website/tags/${id}`);
    message.success('Tag deleted');
    await loadTags();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete tag');
  }
}

onMounted(() => loadTags());
</script>

<template>
  <div class="p-6">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Hash :size="20" class="text-blue-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Tags</h1>
          <p class="text-sm text-gray-500 m-0">Label pages with flat tags</p>
        </div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><Plus :size="16" /></template>
        New Tag
      </a-button>
    </div>

    <div class="flex items-center gap-3 mb-4">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Search tags..."
        style="width: 260px"
        @search="loadTags"
        allow-clear
        @change="!searchQuery && loadTags()"
      />
    </div>

    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="tags"
        :loading="loading"
        row-key="id"
        :pagination="{ pageSize: 20 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="flex items-center gap-2">
              <Hash :size="14" class="text-blue-400" />
              <span class="font-medium">{{ record.name }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'slug'">
            <code class="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{{ record.slug }}</code>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-button type="text" size="small" @click="openEdit(record)">
                <template #icon><Pencil :size="14" /></template>
              </a-button>
              <a-popconfirm title="Delete this tag?" @confirm="handleDelete(record.id)">
                <a-button type="text" size="small" danger>
                  <template #icon><Trash2 :size="14" /></template>
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-drawer
      v-model:open="drawerOpen"
      :title="isEditing ? 'Edit Tag' : 'New Tag'"
      width="380"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Tag name" @input="onNameInput" />
        </a-form-item>
        <a-form-item label="Slug">
          <a-input v-model:value="form.slug" placeholder="tag-slug" />
        </a-form-item>
      </a-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="drawerOpen = false">Cancel</a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            {{ isEditing ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>
