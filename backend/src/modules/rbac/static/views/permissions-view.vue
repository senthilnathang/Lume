<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Key,
  RefreshCw,
  Search,
} from 'lucide-vue-next';

import { getPermissions, type Permission } from '@modules/rbac/static/api/permissions';

defineOptions({ name: 'PermissionsView' });

// State
const loading = ref(false);
const permissions = ref<Permission[]>([]);
const searchQuery = ref('');
const categoryFilter = ref<string | undefined>(undefined);

// Category color map
const categoryColors: Record<string, string> = {
  user_management: 'blue',
  role_management: 'purple',
  activities: 'green',
  donations: 'red',
  documents: 'orange',
  team: 'cyan',
  messages: 'gold',
  settings: 'default',
  reports: 'geekblue',
  audit: 'volcano',
  general: 'default',
};

// Computed
const categories = computed(() => {
  const cats = new Set<string>();
  for (const p of permissions.value) {
    if (p.category) cats.add(p.category);
  }
  return Array.from(cats).sort();
});

const filteredPermissions = computed(() => {
  let result = permissions.value;
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.display_name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    );
  }
  if (categoryFilter.value) {
    result = result.filter((p) => p.category === categoryFilter.value);
  }
  return result;
});

const totalPermissions = computed(() => permissions.value.length);
const totalCategories = computed(() => categories.value.length);
const activePermissions = computed(() => permissions.value.filter((p) => p.is_active).length);

// Table columns
const columns: ColumnsType = [
  { title: 'Permission', key: 'permission', width: 280 },
  { title: 'Category', key: 'category', width: 160 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Status', key: 'status', width: 100 },
];

// Methods
async function loadData() {
  loading.value = true;
  try {
    const res = await getPermissions();
    permissions.value = Array.isArray(res) ? res : [];
  } catch (error) {
    message.error('Failed to load permissions');
    console.error('Failed to load permissions:', error);
  } finally {
    loading.value = false;
  }
}

function getCategoryColor(category: string) {
  return categoryColors[category] || 'default';
}

function formatCategoryName(category: string) {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="permissions-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Key :size="24" />
          Permissions
        </h1>
        <p class="text-gray-500 m-0">
          View system permissions defined by modules. Permissions are read-only.
        </p>
      </div>
      <a-button @click="loadData" :loading="loading">
        <template #icon><RefreshCw :size="14" /></template>
        Refresh
      </a-button>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ totalPermissions }}</div>
            <div class="text-gray-500 text-sm">Total Permissions</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ totalCategories }}</div>
            <div class="text-gray-500 text-sm">Categories</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="8">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ activePermissions }}</div>
            <div class="text-gray-500 text-sm">Active</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="12">
          <a-input v-model:value="searchQuery" placeholder="Search permissions..." allow-clear>
            <template #prefix><Search :size="14" class="text-gray-400" /></template>
          </a-input>
        </a-col>
        <a-col :xs="24" :sm="12">
          <a-select
            v-model:value="categoryFilter"
            placeholder="Filter by category"
            allow-clear
            style="width: 100%"
          >
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">
              {{ formatCategoryName(cat) }}
            </a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Table -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="filteredPermissions"
        :loading="loading"
        :pagination="{ pageSize: 25, showSizeChanger: true, showTotal: (total: number) => `${total} permissions` }"
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <!-- Permission -->
          <template v-if="column.key === 'permission'">
            <div>
              <div class="font-medium">{{ (record as Permission).display_name }}</div>
              <div class="text-xs text-gray-400">
                <code class="bg-gray-100 px-1 py-0.5 rounded">{{ (record as Permission).name }}</code>
              </div>
            </div>
          </template>

          <!-- Category -->
          <template v-else-if="column.key === 'category'">
            <a-tag :color="getCategoryColor((record as Permission).category)">
              {{ formatCategoryName((record as Permission).category) }}
            </a-tag>
          </template>

          <!-- Status -->
          <template v-else-if="column.key === 'status'">
            <a-badge
              :status="(record as Permission).is_active ? 'success' : 'error'"
              :text="(record as Permission).is_active ? 'Active' : 'Inactive'"
            />
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.permissions-page {
  min-height: 100%;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
</style>
