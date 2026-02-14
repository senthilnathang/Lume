<script lang="ts" setup>
import { computed, h, onMounted, ref } from 'vue';
import { message, Modal } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import {
  Package,
  Settings,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Eye,
  Download,
  RefreshCcw,
  Trash2,
  CheckCircle,
  Info,
  ChevronDown,
  AlertTriangle,
} from 'lucide-vue-next';

import {
  getModules,
  installModule,
  uninstallModule,
  upgradeModule,
  type Module,
  type ModuleActionResult,
} from '@modules/base/static/api/modules';

defineOptions({
  name: 'ModulesView',
});

// State
const loading = ref(false);
const modules = ref<Module[]>([]);
const searchQuery = ref('');
const categoryFilter = ref<string | undefined>(undefined);
const stateFilter = ref<string | undefined>(undefined);
const viewMode = ref<'grid' | 'list'>('grid');

// Detail drawer state
const showDetailDrawer = ref(false);
const selectedModule = ref<Module | null>(null);
const actionLoading = ref(false);

// Computed
const categories = computed(() => {
  const cats = new Set<string>();
  for (const mod of modules.value) {
    if (mod.category) {
      cats.add(mod.category);
    }
  }
  return Array.from(cats).sort();
});

const filteredModules = computed(() => {
  let result = modules.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.display_name.toLowerCase().includes(query) ||
        m.summary?.toLowerCase().includes(query),
    );
  }

  if (categoryFilter.value) {
    result = result.filter((m) => m.category === categoryFilter.value);
  }

  if (stateFilter.value) {
    result = result.filter((m) => m.state === stateFilter.value);
  }

  return result;
});

const installedCount = computed(
  () => modules.value.filter((m) => m.state === 'installed').length,
);

const applicationModules = computed(() =>
  filteredModules.value.filter((m) => m.application),
);

const technicalModules = computed(() =>
  filteredModules.value.filter((m) => !m.application),
);

// Table columns for list view
const tableColumns: ColumnsType = [
  {
    title: 'Module',
    key: 'module',
    width: 280,
  },
  {
    title: 'Version',
    dataIndex: 'version',
    key: 'version',
    width: 100,
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 120,
  },
  {
    title: 'Type',
    key: 'type',
    width: 100,
  },
  {
    title: 'State',
    dataIndex: 'state',
    key: 'state',
    width: 120,
  },
  {
    title: 'Author',
    dataIndex: 'author',
    key: 'author',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

// Methods
async function loadModules() {
  loading.value = true;
  try {
    modules.value = await getModules();
  } catch (error) {
    message.error('Failed to load modules');
    console.error('Failed to load modules:', error);
  } finally {
    loading.value = false;
  }
}

function openModuleDetail(mod: Module) {
  selectedModule.value = mod;
  showDetailDrawer.value = true;
}

function closeDetailDrawer() {
  showDetailDrawer.value = false;
  selectedModule.value = null;
}

async function handleInstall(mod: Module) {
  Modal.confirm({
    title: 'Install Module',
    content: `Are you sure you want to install "${mod.display_name}"?`,
    icon: h(AlertTriangle, { size: 20, class: 'text-yellow-500 mr-2' }),
    okText: 'Install',
    okType: 'primary',
    async onOk() {
      actionLoading.value = true;
      try {
        await installModule(mod.name);
        message.success(`Module "${mod.display_name}" installed successfully`);
        await loadModules();
        if (selectedModule.value?.name === mod.name) {
          selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
        }
      } catch (error: any) {
        message.error(error?.response?.data?.error || error.message || 'Failed to install module');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

async function handleUninstall(mod: Module) {
  Modal.confirm({
    title: 'Uninstall Module',
    content: `Are you sure you want to uninstall "${mod.display_name}"? This may affect other modules that depend on it.`,
    icon: h(AlertTriangle, { size: 20, class: 'text-red-500 mr-2' }),
    okText: 'Uninstall',
    okType: 'danger',
    async onOk() {
      actionLoading.value = true;
      try {
        await uninstallModule(mod.name);
        message.success(`Module "${mod.display_name}" uninstalled`);
        await loadModules();
        if (selectedModule.value?.name === mod.name) {
          selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
        }
      } catch (error: any) {
        message.error(error?.response?.data?.error || error.message || 'Failed to uninstall module');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

async function handleUpgrade(mod: Module) {
  actionLoading.value = true;
  try {
    await upgradeModule(mod.name);
    message.success(`Module "${mod.display_name}" upgraded successfully`);
    await loadModules();
    if (selectedModule.value?.name === mod.name) {
      selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
    }
  } catch (error: any) {
    message.error(error.message || 'Failed to upgrade module');
  } finally {
    actionLoading.value = false;
  }
}

function getStateColor(state: Module['state']) {
  switch (state) {
    case 'installed':
      return 'success';
    case 'uninstalled':
      return 'default';
    case 'to_install':
      return 'processing';
    case 'to_upgrade':
      return 'warning';
    case 'to_remove':
      return 'error';
    default:
      return 'default';
  }
}

function getStateText(state: Module['state']) {
  switch (state) {
    case 'installed':
      return 'Installed';
    case 'uninstalled':
      return 'Not Installed';
    case 'to_install':
      return 'Pending Install';
    case 'to_upgrade':
      return 'Pending Upgrade';
    case 'to_remove':
      return 'Pending Remove';
    default:
      return state;
  }
}

function canUninstall(mod: Module) {
  return mod.state === 'installed' && mod.name !== 'base';
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(() => {
  loadModules();
});
</script>

<template>
  <div class="modules-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <Package :size="24" />
          Modules
        </h1>
        <p class="text-gray-500 m-0">
          Manage installed modules and discover new ones
        </p>
      </div>
      <div class="flex items-center gap-2">
        <a-radio-group v-model:value="viewMode" button-style="solid" size="small">
          <a-radio-button value="grid">
            <LayoutGrid :size="14" class="inline-block align-middle" />
            <span class="ml-1 align-middle">Grid</span>
          </a-radio-button>
          <a-radio-button value="list">
            <List :size="14" class="inline-block align-middle" />
            <span class="ml-1 align-middle">List</span>
          </a-radio-button>
        </a-radio-group>
        <a-button @click="loadModules" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
      </div>
    </div>

    <!-- Stats -->
    <a-row :gutter="[16, 16]" class="mb-6">
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-500">{{ modules.length }}</div>
            <div class="text-gray-500 text-sm">Total Modules</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-green-500">{{ installedCount }}</div>
            <div class="text-gray-500 text-sm">Installed</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-500">{{ applicationModules.length }}</div>
            <div class="text-gray-500 text-sm">Applications</div>
          </div>
        </a-card>
      </a-col>
      <a-col :xs="12" :sm="6">
        <a-card size="small" class="stat-card">
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-500">{{ categories.length }}</div>
            <div class="text-gray-500 text-sm">Categories</div>
          </div>
        </a-card>
      </a-col>
    </a-row>

    <!-- Filters -->
    <a-card class="mb-6" size="small">
      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :sm="8">
          <a-input
            v-model:value="searchQuery"
            placeholder="Search modules..."
            allow-clear
          >
            <template #prefix>
              <Search :size="14" class="text-gray-400" />
            </template>
          </a-input>
        </a-col>
        <a-col :xs="12" :sm="8">
          <a-select
            v-model:value="categoryFilter"
            placeholder="Filter by category"
            allow-clear
            style="width: 100%"
          >
            <a-select-option v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </a-select-option>
          </a-select>
        </a-col>
        <a-col :xs="12" :sm="8">
          <a-select
            v-model:value="stateFilter"
            placeholder="Filter by state"
            allow-clear
            style="width: 100%"
          >
            <a-select-option value="installed">Installed</a-select-option>
            <a-select-option value="uninstalled">Not Installed</a-select-option>
            <a-select-option value="to_upgrade">Needs Upgrade</a-select-option>
          </a-select>
        </a-col>
      </a-row>
    </a-card>

    <!-- Module Content -->
    <a-spin :spinning="loading">
      <!-- List View -->
      <a-card v-if="viewMode === 'list'">
        <a-table
          :columns="tableColumns"
          :data-source="filteredModules"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :scroll="{ x: 1000 }"
          row-key="name"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <!-- Module Name & Summary -->
            <template v-if="column.key === 'module'">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="record.application ? 'bg-purple-100' : 'bg-blue-100'"
                >
                  <Package v-if="record.application" :size="18" class="text-purple-500" />
                  <Settings v-else :size="18" class="text-blue-500" />
                </div>
                <div>
                  <div class="font-medium">{{ record.display_name }}</div>
                  <div class="text-xs text-gray-400 truncate max-w-[200px]">
                    {{ record.summary || 'No description' }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Type -->
            <template v-else-if="column.key === 'type'">
              <a-tag :color="record.application ? 'purple' : 'blue'">
                {{ record.application ? 'App' : 'Technical' }}
              </a-tag>
            </template>

            <!-- State -->
            <template v-else-if="column.key === 'state'">
              <a-badge
                :status="getStateColor(record.state)"
                :text="getStateText(record.state)"
              />
            </template>

            <!-- Actions -->
            <template v-else-if="column.key === 'actions'">
              <div class="flex items-center gap-1">
                <a-tooltip title="View Details">
                  <a-button type="text" size="small" @click="openModuleDetail(record as any)">
                    <Eye :size="14" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="record.state !== 'installed'" title="Install">
                  <a-button type="text" size="small" @click="handleInstall(record as any)">
                    <Download :size="14" class="text-green-500" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="record.state === 'installed'" title="Upgrade">
                  <a-button type="text" size="small" @click="handleUpgrade(record as any)">
                    <RefreshCcw :size="14" class="text-blue-500" />
                  </a-button>
                </a-tooltip>
                <a-tooltip v-if="canUninstall(record as any)" title="Uninstall">
                  <a-button type="text" size="small" danger @click="handleUninstall(record as any)">
                    <Trash2 :size="14" />
                  </a-button>
                </a-tooltip>
              </div>
            </template>
          </template>
        </a-table>
      </a-card>

      <!-- Grid View -->
      <template v-else>
        <!-- Applications Section -->
        <div v-if="applicationModules.length > 0" class="mb-6">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package :size="20" />
            Applications
          </h2>
          <a-row :gutter="[16, 16]">
            <a-col
              v-for="mod in applicationModules"
              :key="mod.name"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <a-card
                hoverable
                class="module-card"
                :class="{
                  'border-green-400': mod.state === 'installed',
                  'opacity-60': mod.state === 'uninstalled',
                }"
                @click="openModuleDetail(mod)"
              >
                <template #title>
                  <div class="flex items-center justify-between">
                    <span class="truncate text-sm" :title="mod.display_name">
                      {{ mod.display_name }}
                    </span>
                    <a-badge
                      :status="getStateColor(mod.state)"
                      :text="getStateText(mod.state)"
                    />
                  </div>
                </template>
                <template #extra>
                  <a-dropdown @click.stop>
                    <a-button size="small" type="text">
                      <ChevronDown :size="14" />
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item key="view" @click="openModuleDetail(mod)">
                          <Eye :size="14" class="mr-1" /> View Details
                        </a-menu-item>
                        <a-menu-item
                          v-if="mod.state !== 'installed'"
                          key="install"
                          @click="handleInstall(mod)"
                        >
                          <Download :size="14" class="mr-1" /> Install
                        </a-menu-item>
                        <a-menu-item
                          v-if="mod.state === 'installed'"
                          key="upgrade"
                          @click="handleUpgrade(mod)"
                        >
                          <RefreshCcw :size="14" class="mr-1" /> Upgrade
                        </a-menu-item>
                        <a-menu-item
                          v-if="canUninstall(mod)"
                          key="uninstall"
                          danger
                          @click="handleUninstall(mod)"
                        >
                          <Trash2 :size="14" class="mr-1" /> Uninstall
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </template>

                <p class="text-gray-500 text-sm mb-3 line-clamp-2">
                  {{ mod.summary || 'No description available' }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-400">
                  <span>v{{ mod.version }}</span>
                  <a-tag v-if="mod.category" size="small">{{ mod.category }}</a-tag>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>

        <!-- Technical Modules Section -->
        <div v-if="technicalModules.length > 0">
          <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings :size="20" />
            Technical Modules
          </h2>
          <a-row :gutter="[16, 16]">
            <a-col
              v-for="mod in technicalModules"
              :key="mod.name"
              :xs="24"
              :sm="12"
              :md="8"
              :lg="6"
            >
              <a-card
                size="small"
                hoverable
                class="module-card"
                :class="{
                  'border-green-400': mod.state === 'installed',
                  'opacity-60': mod.state === 'uninstalled',
                }"
                @click="openModuleDetail(mod)"
              >
                <template #title>
                  <div class="flex items-center gap-2">
                    <CheckCircle
                      v-if="mod.state === 'installed'"
                      :size="14"
                      class="text-green-500 flex-shrink-0"
                    />
                    <Info v-else :size="14" class="text-gray-400 flex-shrink-0" />
                    <span class="truncate text-sm" :title="mod.display_name">
                      {{ mod.display_name }}
                    </span>
                  </div>
                </template>
                <template #extra>
                  <a-dropdown @click.stop>
                    <a-button size="small" type="text">
                      <ChevronDown :size="14" />
                    </a-button>
                    <template #overlay>
                      <a-menu>
                        <a-menu-item key="view" @click="openModuleDetail(mod)">
                          <Eye :size="14" class="mr-1" /> View Details
                        </a-menu-item>
                        <a-menu-item
                          v-if="mod.state !== 'installed'"
                          key="install"
                          @click="handleInstall(mod)"
                        >
                          <Download :size="14" class="mr-1" /> Install
                        </a-menu-item>
                        <a-menu-item
                          v-if="mod.state === 'installed'"
                          key="upgrade"
                          @click="handleUpgrade(mod)"
                        >
                          <RefreshCcw :size="14" class="mr-1" /> Upgrade
                        </a-menu-item>
                        <a-menu-item
                          v-if="canUninstall(mod)"
                          key="uninstall"
                          danger
                          @click="handleUninstall(mod)"
                        >
                          <Trash2 :size="14" class="mr-1" /> Uninstall
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </template>

                <p class="text-gray-500 text-xs mb-2 line-clamp-2">
                  {{ mod.summary || 'No description' }}
                </p>

                <div class="flex items-center justify-between text-xs text-gray-400">
                  <span>v{{ mod.version }}</span>
                  <span v-if="mod.author">{{ mod.author }}</span>
                </div>
              </a-card>
            </a-col>
          </a-row>
        </div>
      </template>

      <!-- Empty State -->
      <a-empty
        v-if="!loading && filteredModules.length === 0"
        description="No modules found"
      />
    </a-spin>

    <!-- Module Detail Drawer -->
    <a-drawer
      v-model:open="showDetailDrawer"
      :title="selectedModule?.display_name || 'Module Details'"
      width="600"
      placement="right"
      @close="closeDetailDrawer"
    >
      <template v-if="selectedModule">
        <a-spin :spinning="actionLoading">
          <!-- Module Header -->
          <div class="mb-6">
            <div class="flex items-start gap-4 mb-4">
              <div
                class="w-16 h-16 rounded-xl flex items-center justify-center"
                :class="selectedModule.application ? 'bg-purple-100' : 'bg-blue-100'"
              >
                <Package
                  v-if="selectedModule.application"
                  :size="28"
                  class="text-purple-500"
                />
                <Settings v-else :size="28" class="text-blue-500" />
              </div>
              <div class="flex-1">
                <h2 class="text-xl font-semibold m-0">
                  {{ selectedModule.display_name }}
                </h2>
                <div class="flex items-center gap-2 mt-1">
                  <a-tag :color="selectedModule.application ? 'purple' : 'blue'">
                    {{ selectedModule.application ? 'Application' : 'Technical' }}
                  </a-tag>
                  <a-badge
                    :status="getStateColor(selectedModule.state)"
                    :text="getStateText(selectedModule.state)"
                  />
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-2 mb-4">
              <a-button
                v-if="selectedModule.state !== 'installed'"
                type="primary"
                block
                :loading="actionLoading"
                @click="handleInstall(selectedModule)"
              >
                <template #icon><Download :size="14" /></template>
                Install Module
              </a-button>
              <template v-else>
                <a-button
                  block
                  :loading="actionLoading"
                  @click="handleUpgrade(selectedModule)"
                >
                  <template #icon><RefreshCcw :size="14" /></template>
                  Upgrade
                </a-button>
                <a-button
                  v-if="canUninstall(selectedModule)"
                  danger
                  block
                  :loading="actionLoading"
                  @click="handleUninstall(selectedModule)"
                >
                  <template #icon><Trash2 :size="14" /></template>
                  Uninstall
                </a-button>
              </template>
            </div>

            <a-alert
              v-if="selectedModule.name === 'base'"
              type="info"
              show-icon
              message="Core Module"
              description="The base module is required for the system to function and cannot be uninstalled."
              class="mb-4"
            />
          </div>

          <!-- Summary -->
          <p v-if="selectedModule.summary" class="text-gray-600 mb-6">
            {{ selectedModule.summary }}
          </p>

          <!-- Description -->
          <div v-if="selectedModule.description" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
            <p class="text-gray-600 whitespace-pre-wrap">
              {{ selectedModule.description }}
            </p>
          </div>

          <!-- Module Info -->
          <a-descriptions
            :column="1"
            bordered
            size="small"
            class="mb-6"
          >
            <a-descriptions-item label="Technical Name">
              <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ selectedModule.name }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Version">
              {{ selectedModule.version }}
            </a-descriptions-item>
            <a-descriptions-item label="Category">
              <a-tag>{{ selectedModule.category || 'Uncategorized' }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="License">
              {{ selectedModule.license || 'MIT' }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedModule.author" label="Author">
              {{ selectedModule.author }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedModule.website" label="Website">
              <a :href="selectedModule.website" target="_blank" class="text-blue-500 hover:underline">
                {{ selectedModule.website }}
              </a>
            </a-descriptions-item>
            <a-descriptions-item label="Installed At">
              {{ formatDate(selectedModule.installed_at) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedModule.module_path" label="Path">
              <code class="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{{ selectedModule.module_path }}</code>
            </a-descriptions-item>
          </a-descriptions>

          <!-- Dependencies -->
          <div v-if="selectedModule.depends && selectedModule.depends.length > 0" class="mb-6">
            <h3 class="text-sm font-semibold text-gray-500 mb-2">Dependencies</h3>
            <div class="flex flex-wrap gap-2">
              <a-tag v-for="dep in selectedModule.depends" :key="dep" color="blue">
                {{ dep }}
              </a-tag>
            </div>
          </div>
        </a-spin>
      </template>
    </a-drawer>
  </div>
</template>

<style scoped>
.modules-page {
  min-height: 100%;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.border-green-400 {
  border-color: #52c41a !important;
}

.stat-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.module-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:deep(.ant-card-head-title) {
  font-size: 14px;
}

:deep(.ant-descriptions-item-label) {
  font-weight: 500;
  color: #6b7280;
}
</style>
