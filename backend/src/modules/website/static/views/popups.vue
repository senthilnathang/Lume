<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { Maximize2, Plus, Edit3, Trash2, Search } from 'lucide-vue-next';
import { getPopups, createPopup, updatePopup, deletePopup } from '../api/index';

defineOptions({ name: 'WebsitePopups' });

const loading = ref(false);
const popups = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const searchQuery = ref('');

// Editor drawer
const editorVisible = ref(false);
const editorLoading = ref(false);
const editingPopup = reactive({
  id: null as number | null,
  name: '',
  content: '',
  contentHtml: '',
  triggerType: 'page-load' as 'page-load' | 'scroll' | 'timer' | 'exit-intent' | 'click',
  triggerValue: '',
  position: 'center' as 'center' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  width: 'md' as 'sm' | 'md' | 'lg' | 'full',
  overlayClose: true,
  showOnce: false,
  conditions: null as { pages?: string[]; excludePages?: string[] } | null,
  isActive: true,
});

const triggerTypeOptions = [
  { value: 'page-load', label: 'Page Load' },
  { value: 'scroll', label: 'Scroll' },
  { value: 'timer', label: 'Timer' },
  { value: 'exit-intent', label: 'Exit Intent' },
  { value: 'click', label: 'Click' },
];

const positionOptions = [
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
];

const widthOptions = [
  { value: 'sm', label: 'Small (400px)' },
  { value: 'md', label: 'Medium (600px)' },
  { value: 'lg', label: 'Large (800px)' },
  { value: 'full', label: 'Full Width' },
];

const triggerValuePlaceholder = computed(() => {
  switch (editingPopup.triggerType) {
    case 'scroll': return 'Scroll percentage (e.g. 50)';
    case 'timer': return 'Delay in seconds (e.g. 5)';
    case 'click': return 'CSS selector (e.g. .cta-button)';
    case 'exit-intent': return 'No value needed';
    case 'page-load': return 'No value needed';
    default: return '';
  }
});

const triggerLabel = computed(() => (type: string) => {
  return triggerTypeOptions.find(t => t.value === type)?.label || type;
});

async function loadPopups() {
  loading.value = true;
  try {
    const result = await getPopups({
      page: page.value,
      limit: 20,
      search: searchQuery.value || undefined,
    });
    popups.value = result.data || result || [];
    total.value = result.pagination?.total || 0;
  } catch {
    message.error('Failed to load popups');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(editingPopup, {
    id: null,
    name: '',
    content: '',
    contentHtml: '',
    triggerType: 'page-load',
    triggerValue: '',
    position: 'center',
    width: 'md',
    overlayClose: true,
    showOnce: false,
    conditions: null,
    isActive: true,
  });
}

function openCreate() {
  resetForm();
  editorVisible.value = true;
}

async function openEdit(record: any) {
  resetForm();
  editorVisible.value = true;
  editorLoading.value = true;
  try {
    Object.assign(editingPopup, {
      id: record.id,
      name: record.name,
      content: record.content || '',
      contentHtml: record.contentHtml || '',
      triggerType: record.triggerType || 'page-load',
      triggerValue: record.triggerValue || '',
      position: record.position || 'center',
      width: record.width || 'md',
      overlayClose: record.overlayClose ?? true,
      showOnce: record.showOnce ?? false,
      conditions: record.conditions ? (typeof record.conditions === 'string' ? JSON.parse(record.conditions) : record.conditions) : null,
      isActive: record.isActive ?? true,
    });
  } catch {
    message.error('Failed to load popup');
    editorVisible.value = false;
  } finally {
    editorLoading.value = false;
  }
}

async function savePopup() {
  if (!editingPopup.name.trim()) {
    message.warning('Popup name is required');
    return;
  }
  editorLoading.value = true;
  try {
    const payload = {
      name: editingPopup.name,
      content: editingPopup.content,
      contentHtml: editingPopup.contentHtml,
      triggerType: editingPopup.triggerType,
      triggerValue: editingPopup.triggerValue,
      position: editingPopup.position,
      width: editingPopup.width,
      overlayClose: editingPopup.overlayClose,
      showOnce: editingPopup.showOnce,
      conditions: editingPopup.conditions,
      isActive: editingPopup.isActive,
    };
    if (editingPopup.id) {
      await updatePopup(editingPopup.id, payload);
      message.success('Popup updated');
    } else {
      await createPopup(payload);
      message.success('Popup created');
    }
    editorVisible.value = false;
    loadPopups();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save popup');
  } finally {
    editorLoading.value = false;
  }
}

async function handleDelete(id: number) {
  Modal.confirm({
    title: 'Delete Popup',
    content: 'Are you sure you want to delete this popup?',
    okType: 'danger',
    async onOk() {
      try {
        await deletePopup(id);
        message.success('Popup deleted');
        loadPopups();
      } catch {
        message.error('Failed to delete popup');
      }
    },
  });
}

async function toggleActive(record: any) {
  try {
    await updatePopup(record.id, { isActive: !record.isActive });
    record.isActive = !record.isActive;
    message.success(record.isActive ? 'Popup activated' : 'Popup deactivated');
  } catch {
    message.error('Failed to update popup status');
  }
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
}

function getTriggerColor(type: string) {
  const colors: Record<string, string> = {
    'page-load': 'blue',
    'scroll': 'cyan',
    'timer': 'orange',
    'exit-intent': 'purple',
    'click': 'green',
  };
  return colors[type] || 'default';
}

onMounted(loadPopups);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Trigger', key: 'trigger', width: 200 },
  { title: 'Position', dataIndex: 'position', key: 'position', width: 130 },
  { title: 'Status', dataIndex: 'isActive', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 120 },
];
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
          <Maximize2 :size="20" class="text-purple-600" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-800 m-0">Popups</h2>
          <p class="text-sm text-gray-500 m-0">Create and manage site popups</p>
        </div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><Plus :size="16" /></template>
        New Popup
      </a-button>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <a-input
        v-model:value="searchQuery"
        placeholder="Search popups..."
        allow-clear
        style="width: 300px;"
        @pressEnter="loadPopups"
        @change="loadPopups"
      >
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="popups"
      :loading="loading"
      :pagination="{ current: page, total, pageSize: 20 }"
      row-key="id"
      @change="(p: any) => { page = p.current; loadPopups(); }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="font-medium">{{ record.name }}</div>
        </template>

        <template v-else-if="column.key === 'trigger'">
          <div class="flex items-center gap-2">
            <a-tag :color="getTriggerColor(record.triggerType)">
              {{ triggerTypeOptions.find(t => t.value === record.triggerType)?.label || record.triggerType }}
            </a-tag>
            <span v-if="record.triggerValue" class="text-xs text-gray-500">{{ record.triggerValue }}</span>
          </div>
        </template>

        <template v-else-if="column.key === 'position'">
          <span class="text-sm text-gray-600 capitalize">{{ record.position }}</span>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-switch
            :checked="record.isActive"
            size="small"
            @change="toggleActive(record)"
          />
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-1">
            <a-button type="text" size="small" @click="openEdit(record)">
              <template #icon><Edit3 :size="14" /></template>
            </a-button>
            <a-button type="text" size="small" danger @click="handleDelete(record.id)">
              <template #icon><Trash2 :size="14" /></template>
            </a-button>
          </div>
        </template>
      </template>
    </a-table>

    <!-- Editor Drawer -->
    <a-drawer
      :open="editorVisible"
      :title="editingPopup.id ? 'Edit Popup' : 'New Popup'"
      :width="700"
      @close="editorVisible = false"
    >
      <a-spin :spinning="editorLoading">
        <a-form layout="vertical">
          <!-- General -->
          <a-divider orientation="left" class="!mt-0">General</a-divider>

          <a-form-item label="Name" required>
            <a-input v-model:value="editingPopup.name" placeholder="Welcome Popup" />
          </a-form-item>

          <a-form-item>
            <a-switch v-model:checked="editingPopup.isActive" /> <span class="ml-2 text-sm">Active</span>
          </a-form-item>

          <!-- Trigger -->
          <a-divider orientation="left">Trigger</a-divider>

          <a-form-item label="Trigger Type">
            <a-select v-model:value="editingPopup.triggerType" class="w-full">
              <a-select-option v-for="opt in triggerTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item
            v-if="['scroll', 'timer', 'click'].includes(editingPopup.triggerType)"
            label="Trigger Value"
          >
            <a-input v-model:value="editingPopup.triggerValue" :placeholder="triggerValuePlaceholder" />
          </a-form-item>

          <!-- Display -->
          <a-divider orientation="left">Display</a-divider>

          <div class="grid grid-cols-2 gap-4">
            <a-form-item label="Position">
              <a-select v-model:value="editingPopup.position" class="w-full">
                <a-select-option v-for="opt in positionOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="Width">
              <a-select v-model:value="editingPopup.width" class="w-full">
                <a-select-option v-for="opt in widthOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>

          <div class="flex gap-6 mb-4">
            <div>
              <a-switch v-model:checked="editingPopup.overlayClose" />
              <span class="ml-2 text-sm">Close on overlay click</span>
            </div>
            <div>
              <a-switch v-model:checked="editingPopup.showOnce" />
              <span class="ml-2 text-sm">Show only once per visitor</span>
            </div>
          </div>

          <!-- Content -->
          <a-divider orientation="left">Content</a-divider>

          <a-form-item label="Popup Content">
            <a-textarea
              v-model:value="editingPopup.content"
              :rows="8"
              placeholder='{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Your popup content here..."}]}]}'
            />
          </a-form-item>

          <a-form-item label="Content HTML (rendered)">
            <a-textarea
              v-model:value="editingPopup.contentHtml"
              :rows="4"
              placeholder="<p>Your popup content here...</p>"
            />
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="editorVisible = false">Cancel</a-button>
          <a-button type="primary" :loading="editorLoading" @click="savePopup">Save</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.capitalize {
  text-transform: capitalize;
}
</style>
