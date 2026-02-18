<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { Tag, Plus, Pencil, Trash2, FolderTree, ArrowUp, ArrowDown, GripVertical } from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';

defineOptions({ name: 'WebsiteCategories' });

const loading = ref(false);
const saving = ref(false);
const reordering = ref(false);
const categories = ref<any[]>([]);
const searchQuery = ref('');
const drawerOpen = ref(false);
const isEditing = ref(false);

const form = reactive({
  name: '',
  slug: '',
  description: '',
  parentId: null as number | null,
});

const editingId = ref<number | null>(null);

const columns = [
  { title: '', key: 'sort', width: 40 },
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Slug', dataIndex: 'slug', key: 'slug' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Actions', key: 'actions', width: 130 },
];

// Drag-drop reorder state
const dragId = ref<number | null>(null);
const dragOverId = ref<number | null>(null);

function onDragStart(id: number) { dragId.value = id; }
function onDragOver(e: DragEvent, id: number) { e.preventDefault(); dragOverId.value = id; }
function onDragLeave() { dragOverId.value = null; }

async function onDrop(targetId: number) {
  if (!dragId.value || dragId.value === targetId) { dragId.value = null; dragOverId.value = null; return; }
  // Reorder within the same parent group: swap sequences
  const fromIdx = categories.value.findIndex(c => c.id === dragId.value);
  const toIdx = categories.value.findIndex(c => c.id === targetId);
  if (fromIdx === -1 || toIdx === -1) { dragId.value = null; dragOverId.value = null; return; }
  const updated = [...categories.value];
  const [moved] = updated.splice(fromIdx, 1);
  updated.splice(toIdx, 0, moved);
  // Assign new sequences
  const items = updated.map((c, i) => ({ id: c.id, sequence: i }));
  categories.value = updated;
  dragId.value = null;
  dragOverId.value = null;
  await saveReorder(items);
}

async function moveUp(cat: any) {
  const siblings = categories.value.filter(c => c.parentId === cat.parentId);
  const idx = siblings.findIndex(c => c.id === cat.id);
  if (idx <= 0) return;
  // Swap sequence with previous sibling in the flat list
  const flatFrom = categories.value.findIndex(c => c.id === cat.id);
  const flatTo = categories.value.findIndex(c => c.id === siblings[idx - 1].id);
  const updated = [...categories.value];
  [updated[flatFrom], updated[flatTo]] = [updated[flatTo], updated[flatFrom]];
  categories.value = updated;
  await saveReorder(updated.map((c, i) => ({ id: c.id, sequence: i })));
}

async function moveDown(cat: any) {
  const siblings = categories.value.filter(c => c.parentId === cat.parentId);
  const idx = siblings.findIndex(c => c.id === cat.id);
  if (idx >= siblings.length - 1) return;
  const flatFrom = categories.value.findIndex(c => c.id === cat.id);
  const flatTo = categories.value.findIndex(c => c.id === siblings[idx + 1].id);
  const updated = [...categories.value];
  [updated[flatFrom], updated[flatTo]] = [updated[flatTo], updated[flatFrom]];
  categories.value = updated;
  await saveReorder(updated.map((c, i) => ({ id: c.id, sequence: i })));
}

async function saveReorder(items: { id: number; sequence: number }[]) {
  reordering.value = true;
  try {
    await put('/website/categories/reorder', { items });
  } catch {
    message.error('Failed to save order');
    await loadCategories();
  } finally {
    reordering.value = false;
  }
}

// Build hierarchical tree from flat list
const categoriesTree = computed(() => {
  const all = categories.value;
  const q = searchQuery.value.toLowerCase();

  // When searching: show flat filtered list
  if (q) {
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q),
    );
  }

  const nodeMap = new Map<number, any>();
  for (const cat of all) nodeMap.set(cat.id, { ...cat, children: [] });

  const roots: any[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Remove empty children arrays so leaf rows don't get expand arrows
  function clean(nodes: any[]) {
    for (const n of nodes) {
      if (n.children.length === 0) delete n.children;
      else clean(n.children);
    }
  }
  clean(roots);
  return roots;
});

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function onNameInput() {
  if (!isEditing.value) form.slug = generateSlug(form.name);
}


async function loadCategories() {
  loading.value = true;
  try {
    const data = await get('/website/categories', { params: { search: searchQuery.value || undefined } });
    categories.value = Array.isArray(data) ? data : data?.rows || data?.data || [];
  } catch (err: any) {
    message.error('Failed to load categories');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  isEditing.value = false;
  editingId.value = null;
  form.name = '';
  form.slug = '';
  form.description = '';
  form.parentId = null;
  drawerOpen.value = true;
}

function openEdit(cat: any) {
  isEditing.value = true;
  editingId.value = cat.id;
  form.name = cat.name || '';
  form.slug = cat.slug || '';
  form.description = cat.description || '';
  form.parentId = cat.parentId || null;
  drawerOpen.value = true;
}

async function handleSave() {
  if (!form.name.trim()) { message.warning('Name is required'); return; }
  saving.value = true;
  try {
    if (isEditing.value && editingId.value) {
      await put(`/website/categories/${editingId.value}`, { ...form });
      message.success('Category updated');
    } else {
      await post('/website/categories', { ...form });
      message.success('Category created');
    }
    drawerOpen.value = false;
    await loadCategories();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save category');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: number) {
  try {
    await del(`/website/categories/${id}`);
    message.success('Category deleted');
    await loadCategories();
  } catch (err: any) {
    message.error(err?.message || 'Failed to delete category');
  }
}

onMounted(() => loadCategories());
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
          <FolderTree :size="20" class="text-green-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Categories</h1>
          <p class="text-sm text-gray-500 m-0">Organize pages with hierarchical categories</p>
        </div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><Plus :size="16" /></template>
        New Category
      </a-button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-3 mb-4">
      <a-input-search
        v-model:value="searchQuery"
        placeholder="Search categories..."
        style="width: 280px"
        @search="loadCategories"
        allow-clear
        @change="!searchQuery && loadCategories()"
      />
    </div>

    <!-- Tree Table -->
    <a-card :body-style="{ padding: 0 }">
      <a-table
        :columns="columns"
        :data-source="categoriesTree"
        :loading="loading || reordering"
        row-key="id"
        children-column-name="children"
        :default-expand-all-rows="true"
        :pagination="{ pageSize: 50 }"
        :row-class-name="(record: any) => dragOverId === record.id ? 'bg-blue-50' : ''"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sort'">
            <div
              class="cursor-grab text-gray-300 hover:text-gray-500 flex justify-center"
              :draggable="!searchQuery"
              @dragstart="onDragStart(record.id)"
              @dragover="(e: DragEvent) => onDragOver(e, record.id)"
              @dragleave="onDragLeave"
              @drop="onDrop(record.id)"
            >
              <GripVertical :size="14" />
            </div>
          </template>
          <template v-else-if="column.key === 'name'">
            <div class="flex items-center gap-2">
              <FolderTree v-if="record.children?.length" :size="14" class="text-green-600" />
              <Tag v-else :size="14" class="text-green-400" />
              <span class="font-medium">{{ record.name }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'slug'">
            <code class="text-xs text-gray-500 bg-gray-100 px-1 py-0.5 rounded">{{ record.slug }}</code>
          </template>
          <template v-else-if="column.key === 'description'">
            <span class="text-gray-500 text-sm">{{ record.description || '—' }}</span>
          </template>
          <template v-else-if="column.key === 'actions'">
            <div class="flex items-center gap-1">
              <a-tooltip title="Move up">
                <a-button type="text" size="small" :disabled="!!searchQuery" @click="moveUp(record)">
                  <template #icon><ArrowUp :size="12" /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Move down">
                <a-button type="text" size="small" :disabled="!!searchQuery" @click="moveDown(record)">
                  <template #icon><ArrowDown :size="12" /></template>
                </a-button>
              </a-tooltip>
              <a-button type="text" size="small" @click="openEdit(record)">
                <template #icon><Pencil :size="14" /></template>
              </a-button>
              <a-popconfirm title="Delete this category?" @confirm="handleDelete(record.id)">
                <a-button type="text" size="small" danger>
                  <template #icon><Trash2 :size="14" /></template>
                </a-button>
              </a-popconfirm>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- Create/Edit Drawer -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="isEditing ? 'Edit Category' : 'New Category'"
      width="420"
      @close="drawerOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="Name" required>
          <a-input v-model:value="form.name" placeholder="Category name" @input="onNameInput" />
        </a-form-item>
        <a-form-item label="Slug">
          <a-input v-model:value="form.slug" placeholder="category-slug">
            <template #addonBefore>/</template>
          </a-input>
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" placeholder="Optional description" :rows="3" />
        </a-form-item>
        <a-form-item label="Parent Category">
          <a-select v-model:value="form.parentId" placeholder="None (top-level)" allow-clear>
            <a-select-option
              v-for="cat in categories.filter(c => c.id !== editingId)"
              :key="cat.id"
              :value="cat.id"
            >{{ cat.name }}</a-select-option>
          </a-select>
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
