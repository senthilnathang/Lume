<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { Menu as MenuIcon, Plus, RefreshCw, Edit3, Trash2, Eye, EyeOff } from 'lucide-vue-next';
import { getMenus, createMenu, updateMenu, deleteMenu, type Menu } from '@modules/base/static/api/settings';

defineOptions({ name: 'MenusView' });

const loading = ref(false);
const menus = ref<Menu[]>([]);
const showModal = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const formLoading = ref(false);
const editingMenu = ref<Menu | null>(null);
const searchQuery = ref('');

const form = reactive({
  name: '', title: '', path: '', icon: '',
  parentId: undefined as number | undefined,
  sequence: 10, module: '', permission: '', viewName: '',
  hideInMenu: false, isActive: true,
});

const columns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Title', dataIndex: 'title', key: 'title', width: 140 },
  { title: 'Path', dataIndex: 'path', key: 'path', width: 200 },
  { title: 'Icon', dataIndex: 'icon', key: 'icon', width: 100 },
  { title: 'Module', dataIndex: 'module', key: 'module', width: 120 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 80 },
  { title: 'Permission', dataIndex: 'permission', key: 'permission', width: 150, ellipsis: true },
  { title: 'Hidden', key: 'hidden', width: 70 },
  { title: 'Active', key: 'active', width: 70 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

const filteredMenus = ref<Menu[]>([]);

function applyFilter() {
  const q = searchQuery.value.toLowerCase();
  filteredMenus.value = q
    ? menus.value.filter((m) => m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q) || (m.module || '').toLowerCase().includes(q))
    : [...menus.value];
}

async function loadMenus() {
  loading.value = true;
  try {
    const res = await getMenus();
    menus.value = Array.isArray(res) ? res : (res as any)?.data || [];
    applyFilter();
  } catch { menus.value = []; filteredMenus.value = []; }
  finally { loading.value = false; }
}

function openModal(mode: 'create' | 'edit', menu?: Menu) {
  formMode.value = mode;
  if (mode === 'edit' && menu) {
    editingMenu.value = menu;
    Object.assign(form, {
      name: menu.name, title: menu.title || '', path: menu.path,
      icon: menu.icon || '', parentId: menu.parentId || undefined,
      sequence: menu.sequence, module: menu.module || '',
      permission: menu.permission || '', viewName: menu.viewName || '',
      hideInMenu: menu.hideInMenu, isActive: menu.isActive,
    });
  } else {
    editingMenu.value = null;
    Object.assign(form, { name: '', title: '', path: '', icon: '', parentId: undefined, sequence: 10, module: '', permission: '', viewName: '', hideInMenu: false, isActive: true });
  }
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.name || !form.path) { message.warning('Name and Path are required'); return; }
  formLoading.value = true;
  try {
    if (formMode.value === 'edit' && editingMenu.value) {
      await updateMenu(editingMenu.value.id, { ...form });
      message.success('Menu updated');
    } else {
      await createMenu({ ...form });
      message.success('Menu created');
    }
    showModal.value = false;
    await loadMenus();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { formLoading.value = false; }
}

function handleDelete(menu: Menu) {
  Modal.confirm({
    title: 'Delete Menu', content: `Delete "${menu.name}"?`, okType: 'danger', okText: 'Delete',
    async onOk() {
      try { await deleteMenu(menu.id); message.success('Deleted'); await loadMenus(); }
      catch (e: any) { message.error(e?.message || 'Failed'); }
    },
  });
}

onMounted(() => { loadMenus(); });
</script>

<template>
  <div class="menus-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><MenuIcon :size="24" /> Menu Management</h1>
        <p class="text-gray-500 m-0">Configure navigation menus and menu items</p>
      </div>
      <div class="flex gap-2">
        <a-button @click="loadMenus" :loading="loading"><template #icon><RefreshCw :size="14" /></template>Refresh</a-button>
        <a-button type="primary" @click="openModal('create')"><template #icon><Plus :size="14" /></template>Add Menu</a-button>
      </div>
    </div>

    <div class="mb-4">
      <a-input-search v-model:value="searchQuery" placeholder="Search menus..." style="width:300px" @search="applyFilter" @change="applyFilter" allow-clear />
    </div>

    <a-table :columns="columns" :data-source="filteredMenus" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'hidden'">
          <component :is="record.hideInMenu ? EyeOff : Eye" :size="16" :class="record.hideInMenu ? 'text-gray-400' : 'text-green-500'" />
        </template>
        <template v-else-if="column.key === 'active'">
          <a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Yes' : 'No' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="actions-cell flex items-center gap-1">
            <a-tooltip title="Edit">
              <a-button type="text" size="small" @click="openModal('edit', record)">
                <template #icon><Edit3 :size="15" /></template>
              </a-button>
            </a-tooltip>
            <a-popconfirm title="Delete this item?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record)">
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

    <a-modal v-model:open="showModal" :title="formMode === 'create' ? 'Create Menu' : 'Edit Menu'" width="600px" @ok="handleSubmit" :confirm-loading="formLoading">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Name"><a-input v-model:value="form.name" placeholder="Menu name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Title"><a-input v-model:value="form.title" placeholder="Display title" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="16"><a-form-item label="Path"><a-input v-model:value="form.path" placeholder="/settings/example" /></a-form-item></a-col>
          <a-col :span="8"><a-form-item label="Icon"><a-input v-model:value="form.icon" placeholder="icon-name" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Parent Menu">
              <a-select v-model:value="form.parentId" placeholder="None (top level)" allow-clear style="width:100%">
                <a-select-option v-for="m in menus.filter(m => !editingMenu || m.id !== editingMenu.id)" :key="m.id" :value="m.id">{{ m.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="Sequence"><a-input-number v-model:value="form.sequence" :min="0" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Module"><a-input v-model:value="form.module" placeholder="Module name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Permission"><a-input v-model:value="form.permission" placeholder="base.menus.manage" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="View Name"><a-input v-model:value="form.viewName" placeholder="Optional view name" /></a-form-item>
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Hide in Menu"><a-switch v-model:checked="form.hideInMenu" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Active"><a-switch v-model:checked="form.isActive" /></a-form-item></a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.menus-page { min-height: 100%; }

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
