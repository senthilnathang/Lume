<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { Menu, Plus, Edit, Trash2, Link2 } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';

defineOptions({ name: 'WebsiteMenus' });

const loading = ref(false);
const saving = ref(false);
const savingItem = ref(false);
const menus = ref<any[]>([]);
const selectedMenuId = ref<number | null>(null);
const selectedMenu = ref<any>(null);
const menuItems = ref<any[]>([]);
const drawerVisible = ref(false);
const editingMenu = ref<any>(null);
const itemModalVisible = ref(false);
const editingItem = ref<any>(null);

const locations = ['header', 'footer', 'sidebar'];
const targets = ['_self', '_blank'];

const menuForm = reactive({
  name: '',
  location: 'header',
  isActive: true,
});

const itemForm = reactive({
  label: '',
  url: '',
  pageId: null as number | null,
  target: '_self',
  icon: '',
  sequence: 0,
  isActive: true,
});

const locationColors: Record<string, string> = {
  header: 'blue',
  footer: 'green',
  sidebar: 'purple',
};

const sortedMenuItems = computed(() => {
  return [...menuItems.value].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
});

const itemColumns = [
  { title: 'Label', dataIndex: 'label', key: 'label' },
  { title: 'URL / Page', key: 'url', ellipsis: true },
  { title: 'Target', dataIndex: 'target', key: 'target', width: 100 },
  { title: 'Seq', dataIndex: 'sequence', key: 'sequence', width: 70 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 120 },
];

async function loadMenus() {
  loading.value = true;
  try {
    const data = await get('/website/menus');
    menus.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
    if (menus.value.length > 0 && !selectedMenuId.value) {
      await selectMenu(menus.value[0]);
    }
  } catch (err: any) {
    message.error('Failed to load menus');
  } finally {
    loading.value = false;
  }
}

async function selectMenu(menu: any) {
  selectedMenuId.value = menu.id;
  selectedMenu.value = menu;
  try {
    const data = await get(`/website/menus/${menu.id}`);
    menuItems.value = data?.items || data?.menuItems || [];
    if (!Array.isArray(menuItems.value)) {
      menuItems.value = [];
    }
  } catch (err: any) {
    menuItems.value = [];
    message.error('Failed to load menu items');
  }
}

function openMenuDrawer(menu: any = null) {
  editingMenu.value = menu;
  if (menu) {
    Object.assign(menuForm, {
      name: menu.name || '',
      location: menu.location || 'header',
      isActive: menu.isActive !== false,
    });
  } else {
    Object.assign(menuForm, { name: '', location: 'header', isActive: true });
  }
  drawerVisible.value = true;
}

function closeMenuDrawer() {
  drawerVisible.value = false;
  editingMenu.value = null;
}

async function handleSaveMenu() {
  if (!menuForm.name.trim()) {
    message.warning('Menu name is required');
    return;
  }
  saving.value = true;
  try {
    if (editingMenu.value) {
      await put(`/website/menus/${editingMenu.value.id}`, { ...menuForm });
      message.success('Menu updated');
    } else {
      await post('/website/menus', { ...menuForm });
      message.success('Menu created');
    }
    closeMenuDrawer();
    await loadMenus();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save menu');
  } finally {
    saving.value = false;
  }
}

async function handleDeleteMenu(menu: any) {
  try {
    await del(`/website/menus/${menu.id}`);
    message.success('Menu deleted');
    if (selectedMenuId.value === menu.id) {
      selectedMenuId.value = null;
      selectedMenu.value = null;
      menuItems.value = [];
    }
    await loadMenus();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete menu');
  }
}

function openItemModal(item: any = null) {
  editingItem.value = item;
  if (item) {
    Object.assign(itemForm, {
      label: item.label || '',
      url: item.url || '',
      pageId: item.pageId || null,
      target: item.target || '_self',
      icon: item.icon || '',
      sequence: item.sequence || 0,
      isActive: item.isActive !== false,
    });
  } else {
    Object.assign(itemForm, {
      label: '',
      url: '',
      pageId: null,
      target: '_self',
      icon: '',
      sequence: menuItems.value.length,
      isActive: true,
    });
  }
  itemModalVisible.value = true;
}

function closeItemModal() {
  itemModalVisible.value = false;
  editingItem.value = null;
}

async function handleSaveItem() {
  if (!itemForm.label.trim()) {
    message.warning('Label is required');
    return;
  }
  savingItem.value = true;
  try {
    const payload = { ...itemForm };
    if (editingItem.value) {
      await put(`/website/menu-items/${editingItem.value.id}`, payload);
      message.success('Menu item updated');
    } else {
      await post(`/website/menus/${selectedMenuId.value}/items`, payload);
      message.success('Menu item added');
    }
    closeItemModal();
    if (selectedMenu.value) {
      await selectMenu(selectedMenu.value);
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to save menu item');
  } finally {
    savingItem.value = false;
  }
}

async function handleDeleteItem(item: any) {
  try {
    await del(`/website/menu-items/${item.id}`);
    message.success('Menu item deleted');
    if (selectedMenu.value) {
      await selectMenu(selectedMenu.value);
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete menu item');
  }
}

onMounted(() => {
  loadMenus();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Menu :size="20" class="text-purple-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Menus</h1>
          <p class="text-sm text-gray-500 m-0">Manage navigation menus and items</p>
        </div>
      </div>
      <a-button type="primary" @click="openMenuDrawer()">
        <template #icon><Plus :size="16" /></template>
        New Menu
      </a-button>
    </div>

    <!-- Two-panel layout -->
    <div class="flex gap-6">
      <!-- Left: Menu List -->
      <div class="w-72 flex-shrink-0">
        <a-card title="Menus" size="small" :loading="loading">
          <div v-if="menus.length === 0" class="py-4">
            <a-empty description="No menus yet" />
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="menu in menus"
              :key="menu.id"
              class="p-3 border rounded-lg cursor-pointer transition-colors"
              :class="selectedMenuId === menu.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'"
              @click="selectMenu(menu)"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-sm">{{ menu.name }}</span>
                <div class="flex items-center gap-1">
                  <a-tooltip title="Edit">
                    <a-button type="text" size="small" @click.stop="openMenuDrawer(menu)">
                      <template #icon><Edit :size="13" /></template>
                    </a-button>
                  </a-tooltip>
                  <a-popconfirm
                    title="Delete this menu?"
                    ok-text="Delete"
                    ok-type="danger"
                    @confirm="handleDeleteMenu(menu)"
                  >
                    <a-tooltip title="Delete">
                      <a-button type="text" size="small" danger @click.stop>
                        <template #icon><Trash2 :size="13" /></template>
                      </a-button>
                    </a-tooltip>
                  </a-popconfirm>
                </div>
              </div>
              <a-tag :color="locationColors[menu.location] || 'default'" class="mt-1" size="small">
                {{ menu.location }}
              </a-tag>
            </div>
          </div>
        </a-card>
      </div>

      <!-- Right: Menu Items -->
      <div class="flex-1 min-w-0">
        <a-card size="small">
          <template #title>
            <div class="flex items-center justify-between">
              <span v-if="selectedMenu">
                {{ selectedMenu.name }} Items
              </span>
              <span v-else class="text-gray-400">Select a menu</span>
              <a-button
                v-if="selectedMenu"
                type="primary"
                size="small"
                @click="openItemModal()"
              >
                <template #icon><Plus :size="14" /></template>
                Add Item
              </a-button>
            </div>
          </template>

          <div v-if="!selectedMenu" class="py-12">
            <a-empty description="Select a menu from the left panel" />
          </div>
          <a-table
            v-else
            :data-source="sortedMenuItems"
            :columns="itemColumns"
            :row-key="(r: any) => r.id"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'url'">
                <div class="flex items-center gap-1">
                  <span class="text-sm truncate">{{ record.url || `Page #${record.pageId}` }}</span>
                  <Link2 v-if="record.target === '_blank'" :size="12" class="text-gray-400 flex-shrink-0" />
                </div>
              </template>
              <template v-else-if="column.key === 'active'">
                <a-tag :color="record.isActive ? 'green' : 'default'" size="small">
                  {{ record.isActive ? 'Yes' : 'No' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="actions-cell flex items-center gap-1">
                  <a-tooltip title="Edit">
                    <a-button type="text" size="small" @click="openItemModal(record)">
                      <template #icon><Edit :size="14" /></template>
                    </a-button>
                  </a-tooltip>
                  <a-popconfirm
                    title="Delete this item?"
                    ok-text="Delete"
                    ok-type="danger"
                    @confirm="handleDeleteItem(record)"
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
      </div>
    </div>

    <!-- Menu Create/Edit Drawer -->
    <a-drawer
      :open="drawerVisible"
      :title="editingMenu ? 'Edit Menu' : 'New Menu'"
      width="420"
      @close="closeMenuDrawer"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="menuForm.name" placeholder="Menu name" />
        </a-form-item>
        <a-form-item label="Location">
          <a-select v-model:value="menuForm.location">
            <a-select-option v-for="loc in locations" :key="loc" :value="loc">
              {{ loc.charAt(0).toUpperCase() + loc.slice(1) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Active">
          <a-switch v-model:checked="menuForm.isActive" />
        </a-form-item>
      </a-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="closeMenuDrawer">Cancel</a-button>
          <a-button type="primary" :loading="saving" @click="handleSaveMenu">
            {{ editingMenu ? 'Update' : 'Create' }}
          </a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Menu Item Modal -->
    <a-modal
      v-model:open="itemModalVisible"
      :title="editingItem ? 'Edit Menu Item' : 'Add Menu Item'"
      @ok="handleSaveItem"
      :confirm-loading="savingItem"
      width="500px"
    >
      <a-form layout="vertical">
        <a-form-item label="Label" required>
          <a-input v-model:value="itemForm.label" placeholder="Menu item label" />
        </a-form-item>
        <a-form-item label="URL">
          <a-input v-model:value="itemForm.url" placeholder="https://... or /page-slug" />
        </a-form-item>
        <div class="grid grid-cols-2 gap-4">
          <a-form-item label="Target">
            <a-select v-model:value="itemForm.target">
              <a-select-option v-for="t in targets" :key="t" :value="t">
                {{ t }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Sequence">
            <a-input-number v-model:value="itemForm.sequence" :min="0" style="width: 100%" />
          </a-form-item>
        </div>
        <a-form-item label="Icon">
          <a-input v-model:value="itemForm.icon" placeholder="Icon class or name (optional)" />
        </a-form-item>
        <a-form-item label="Active">
          <a-switch v-model:checked="itemForm.isActive" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.space-y-2 > * + * {
  margin-top: 8px;
}
:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
