<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import { Menu, Plus, Edit, Trash2, Link2, GripVertical, Save, LayoutGrid } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';
import draggable from 'vuedraggable';
import MenuTreeNode from '../components/MenuTreeNode.vue';

defineOptions({ name: 'WebsiteMenus' });

const loading = ref(false);
const saving = ref(false);
const savingItem = ref(false);
const savingOrder = ref(false);
const orderDirty = ref(false);
const menus = ref<any[]>([]);
const selectedMenuId = ref<number | null>(null);
const selectedMenu = ref<any>(null);
const menuTree = ref<any[]>([]);
const drawerVisible = ref(false);
const editingMenu = ref<any>(null);
const itemModalVisible = ref(false);
const editingItem = ref<any>(null);
const pages = ref<any[]>([]);
const megaMenuDrawerVisible = ref(false);
const editingMegaMenuItem = ref<any>(null);
const megaMenuContent = ref('');
const savingMegaMenu = ref(false);

const locations = ['header', 'footer', 'sidebar'];
const targets = ['_self', '_blank'];
const linkTypes = ['Custom URL', 'Page'];

const menuForm = reactive({
  name: '',
  location: 'header',
  isActive: true,
});

const itemForm = reactive({
  linkType: 'Custom URL' as string,
  label: '',
  url: '',
  pageId: null as number | null,
  target: '_self',
  icon: '',
  cssClass: '',
  description: '',
  isActive: true,
});

const locationColors: Record<string, string> = {
  header: 'blue',
  footer: 'green',
  sidebar: 'purple',
};

const pageOptions = computed(() =>
  pages.value.map((p: any) => ({ label: p.title, value: p.id, slug: p.slug }))
);

function filterPageOption(input: string, option: any) {
  return option.label.toLowerCase().includes(input.toLowerCase());
}

// --- Menu CRUD ---

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
  orderDirty.value = false;
  try {
    const data = await get(`/website/menus/${menu.id}`);
    menuTree.value = data?.tree || [];
  } catch (err: any) {
    menuTree.value = [];
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
      menuTree.value = [];
    }
    await loadMenus();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete menu');
  }
}

// --- Menu Item CRUD ---

function openItemModal(item: any = null) {
  editingItem.value = item;
  if (item) {
    Object.assign(itemForm, {
      linkType: item.pageId ? 'Page' : 'Custom URL',
      label: item.label || '',
      url: item.url || '',
      pageId: item.pageId || null,
      target: item.target || '_self',
      icon: item.icon || '',
      cssClass: item.cssClass || '',
      description: item.description || '',
      isActive: item.isActive !== false,
    });
  } else {
    Object.assign(itemForm, {
      linkType: 'Custom URL',
      label: '',
      url: '',
      pageId: null,
      target: '_self',
      icon: '',
      cssClass: '',
      description: '',
      isActive: true,
    });
  }
  itemModalVisible.value = true;
}

function closeItemModal() {
  itemModalVisible.value = false;
  editingItem.value = null;
}

function handlePageSelect(pageId: number) {
  const page = pages.value.find((p: any) => p.id === pageId);
  if (page) {
    itemForm.url = `/${page.slug}`;
    if (!itemForm.label) {
      itemForm.label = page.title;
    }
  }
}

async function handleSaveItem() {
  if (!itemForm.label.trim()) {
    message.warning('Label is required');
    return;
  }
  savingItem.value = true;
  try {
    const payload: any = {
      label: itemForm.label,
      url: itemForm.linkType === 'Page' ? itemForm.url : itemForm.url,
      pageId: itemForm.linkType === 'Page' ? itemForm.pageId : null,
      target: itemForm.target,
      icon: itemForm.icon || null,
      cssClass: itemForm.cssClass || null,
      description: itemForm.description || null,
      isActive: itemForm.isActive,
    };
    if (editingItem.value) {
      await put(`/website/menu-items/${editingItem.value.id}`, payload);
      message.success('Menu item updated');
    } else {
      payload.sequence = countAllItems(menuTree.value);
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
    // Also delete children recursively
    if (item.children?.length) {
      for (const child of item.children) {
        await del(`/website/menu-items/${child.id}`);
      }
    }
    await del(`/website/menu-items/${item.id}`);
    message.success('Menu item deleted');
    if (selectedMenu.value) {
      await selectMenu(selectedMenu.value);
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete menu item');
  }
}

// --- Reorder ---

function flattenTree(nodes: any[], parentId: number | null = null): Array<{ id: number; parentId: number | null; sequence: number }> {
  const result: any[] = [];
  nodes.forEach((node, index) => {
    result.push({ id: node.id, parentId, sequence: index });
    if (node.children?.length) {
      result.push(...flattenTree(node.children, node.id));
    }
  });
  return result;
}

function countAllItems(nodes: any[]): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children?.length) count += countAllItems(node.children);
  }
  return count;
}

function handleTreeChange() {
  orderDirty.value = true;
}

async function handleSaveOrder() {
  if (!selectedMenuId.value) return;
  savingOrder.value = true;
  try {
    const items = flattenTree(menuTree.value);
    await put(`/website/menus/${selectedMenuId.value}/reorder`, { items });
    message.success('Menu order saved');
    orderDirty.value = false;
  } catch (err: any) {
    message.error('Failed to save order');
  } finally {
    savingOrder.value = false;
  }
}

// --- Mega Menu ---

function openMegaMenuDrawer(item: any) {
  editingMegaMenuItem.value = item;
  megaMenuContent.value = item.megaMenuContent || '';
  megaMenuDrawerVisible.value = true;
}

function closeMegaMenuDrawer() {
  megaMenuDrawerVisible.value = false;
  editingMegaMenuItem.value = null;
  megaMenuContent.value = '';
}

async function handleSaveMegaMenu() {
  if (!editingMegaMenuItem.value) return;
  savingMegaMenu.value = true;
  try {
    await put(`/website/menu-items/${editingMegaMenuItem.value.id}`, {
      megaMenuContent: megaMenuContent.value || null,
    });
    message.success('Mega menu content saved');
    closeMegaMenuDrawer();
    if (selectedMenu.value) {
      await selectMenu(selectedMenu.value);
    }
  } catch (err: any) {
    message.error(err?.message || 'Failed to save mega menu');
  } finally {
    savingMegaMenu.value = false;
  }
}

// --- Init ---

async function loadPages() {
  try {
    const data = await get('/website/pages', { params: { limit: 200 } });
    pages.value = data?.rows || data?.data || (Array.isArray(data) ? data : []);
  } catch {
    pages.value = [];
  }
}

onMounted(() => {
  loadMenus();
  loadPages();
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
          <h1 class="text-xl font-semibold m-0">Navigation Menus</h1>
          <p class="text-sm text-gray-500 m-0">Manage menus with drag-and-drop ordering and nesting</p>
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
                    title="Delete this menu and all items?"
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

      <!-- Right: Menu Items Tree -->
      <div class="flex-1 min-w-0">
        <a-card size="small">
          <template #title>
            <div class="flex items-center justify-between">
              <span v-if="selectedMenu" class="flex items-center gap-2">
                {{ selectedMenu.name }}
                <a-tag :color="locationColors[selectedMenu.location] || 'default'" size="small">
                  {{ selectedMenu.location }}
                </a-tag>
                <span class="text-xs text-gray-400 font-normal">
                  {{ countAllItems(menuTree) }} item{{ countAllItems(menuTree) !== 1 ? 's' : '' }}
                </span>
              </span>
              <span v-else class="text-gray-400">Select a menu</span>
              <div v-if="selectedMenu" class="flex items-center gap-2">
                <a-button
                  v-if="orderDirty"
                  type="primary"
                  size="small"
                  :loading="savingOrder"
                  @click="handleSaveOrder"
                >
                  <template #icon><Save :size="14" /></template>
                  Save Order
                </a-button>
                <a-tag v-if="orderDirty" color="orange" size="small">Unsaved changes</a-tag>
                <a-button size="small" @click="openItemModal()">
                  <template #icon><Plus :size="14" /></template>
                  Add Item
                </a-button>
              </div>
            </div>
          </template>

          <div v-if="!selectedMenu" class="py-12">
            <a-empty description="Select a menu from the left panel" />
          </div>

          <div v-else-if="menuTree.length === 0" class="py-8">
            <a-empty description="No items in this menu">
              <a-button type="primary" @click="openItemModal()">
                <template #icon><Plus :size="14" /></template>
                Add First Item
              </a-button>
            </a-empty>
          </div>

          <!-- Draggable tree -->
          <div v-else class="menu-tree">
            <div class="text-xs text-gray-400 mb-3 flex items-center gap-1">
              <GripVertical :size="12" />
              Drag items to reorder. Drag right to nest under the item above.
            </div>
            <draggable
              v-model="menuTree"
              :group="{ name: 'menu-items' }"
              item-key="id"
              ghost-class="drag-ghost"
              handle=".drag-handle"
              @change="handleTreeChange"
            >
              <template #item="{ element }">
                <MenuTreeNode
                  :item="element"
                  @edit="openItemModal"
                  @delete="handleDeleteItem"
                  @change="handleTreeChange"
                  @mega-menu="openMegaMenuDrawer"
                />
              </template>
            </draggable>
          </div>
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
          <a-input v-model:value="menuForm.name" placeholder="e.g. Main Navigation" />
        </a-form-item>
        <a-form-item label="Location">
          <a-select v-model:value="menuForm.location">
            <a-select-option v-for="loc in locations" :key="loc" :value="loc">
              {{ loc.charAt(0).toUpperCase() + loc.slice(1) }}
            </a-select-option>
          </a-select>
          <div class="text-xs text-gray-400 mt-1">
            Where this menu appears on the public website
          </div>
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
      width="540px"
    >
      <a-form layout="vertical" class="mt-2">
        <!-- Link Type -->
        <a-form-item label="Link Type">
          <a-segmented v-model:value="itemForm.linkType" :options="linkTypes" block />
        </a-form-item>

        <!-- Label -->
        <a-form-item label="Label" required>
          <a-input v-model:value="itemForm.label" placeholder="Menu item label" />
        </a-form-item>

        <!-- Page picker -->
        <a-form-item v-if="itemForm.linkType === 'Page'" label="Select Page">
          <a-select
            v-model:value="itemForm.pageId"
            show-search
            :filter-option="filterPageOption"
            placeholder="Search pages..."
            :options="pageOptions"
            allow-clear
            @change="handlePageSelect"
          />
          <div v-if="itemForm.url && itemForm.pageId" class="text-xs text-gray-400 mt-1">
            URL: {{ itemForm.url }}
          </div>
        </a-form-item>

        <!-- Custom URL -->
        <a-form-item v-else label="URL">
          <a-input v-model:value="itemForm.url" placeholder="https://example.com or /page-slug" />
        </a-form-item>

        <div class="grid grid-cols-2 gap-4">
          <a-form-item label="Target">
            <a-select v-model:value="itemForm.target">
              <a-select-option v-for="t in targets" :key="t" :value="t">
                {{ t === '_self' ? 'Same Window' : 'New Tab' }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Icon">
            <a-input v-model:value="itemForm.icon" placeholder="lucide icon name" />
          </a-form-item>
        </div>

        <a-form-item label="CSS Class">
          <a-input v-model:value="itemForm.cssClass" placeholder="Optional custom CSS class" />
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea
            v-model:value="itemForm.description"
            placeholder="Short description shown below the label (optional)"
            :rows="2"
          />
        </a-form-item>

        <a-form-item label="Active">
          <a-switch v-model:checked="itemForm.isActive" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Mega Menu Drawer -->
    <a-drawer
      :open="megaMenuDrawerVisible"
      title="Edit Mega Menu"
      width="580"
      @close="closeMegaMenuDrawer"
    >
      <div v-if="editingMegaMenuItem" class="mb-4">
        <div class="text-xs text-gray-500 mb-1">
          Menu item: <strong>{{ editingMegaMenuItem.label }}</strong>
        </div>
        <div class="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 mb-4">
          Mega menu content (TipTap JSON). Paste or edit the JSON structure that will be rendered as the mega menu dropdown for this top-level item.
        </div>
        <a-form layout="vertical">
          <a-form-item label="Mega Menu Content (TipTap JSON)">
            <a-textarea
              v-model:value="megaMenuContent"
              :rows="18"
              placeholder='{"type":"doc","content":[...]}'
              style="font-family: monospace; font-size: 12px"
            />
          </a-form-item>
        </a-form>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="closeMegaMenuDrawer">Cancel</a-button>
          <a-button
            v-if="editingMegaMenuItem?.megaMenuContent"
            danger
            @click="() => { megaMenuContent = ''; handleSaveMegaMenu(); }"
          >
            Clear Mega Menu
          </a-button>
          <a-button type="primary" :loading="savingMegaMenu" @click="handleSaveMegaMenu">
            Save
          </a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.space-y-2 > * + * {
  margin-top: 8px;
}

.menu-tree {
  min-height: 100px;
}

.drag-ghost {
  opacity: 0.3;
  background: #eff6ff;
  border-color: #93c5fd;
  border-radius: 8px;
}
</style>
