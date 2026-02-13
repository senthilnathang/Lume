<script setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Drawer,
  Dropdown,
  Empty,
  Input,
  Menu,
  Modal,
  Radio,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
  RadioGroup,
  DescriptionsItem,
  UploadDragger,
  MenuItem,
  TypographyParagraph,
  RadioButton,
} from 'ant-design-vue';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  CloudDownloadOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  OrderedListOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  TableOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

defineOptions({
  name: 'BaseModules',
});

// State
const loading = ref(false);
const modules = ref([]);
const searchQuery = ref('');
const categoryFilter = ref(undefined);
const stateFilter = ref(undefined);
const showUploadModal = ref(false);
const uploadLoading = ref(false);
const viewMode = ref('grid');

// Detail drawer state
const showDetailDrawer = ref(false);
const selectedModule = ref(null);
const actionLoading = ref(false);

// Computed
const categories = computed(() => {
  const cats = new Set();
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
const tableColumns = [
  { title: 'Module', key: 'module', width: 280 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 100 },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Type', key: 'type', width: 100 },
  { title: 'State', dataIndex: 'state', key: 'state', width: 120 },
  { title: 'Author', dataIndex: 'author', key: 'author', width: 150 },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

// Methods
async function loadModules() {
  loading.value = true;
  try {
    modules.value = await requestClient.get('/modules/');
  } catch (error) {
    message.error('Failed to load modules');
    console.error('Failed to load modules:', error);
  } finally {
    loading.value = false;
  }
}

function openModuleDetail(mod) {
  selectedModule.value = mod;
  showDetailDrawer.value = true;
}

function closeDetailDrawer() {
  showDetailDrawer.value = false;
  selectedModule.value = null;
}

async function handleInstall(mod) {
  Modal.confirm({
    title: 'Install Module',
    content: `Are you sure you want to install "${mod.display_name}"?`,
    icon: h(ExclamationCircleOutlined),
    okText: 'Install',
    okType: 'primary',
    async onOk() {
      actionLoading.value = true;
      try {
        const result = await requestClient.post(`/modules/install/${mod.name}`);
        if (result.success) {
          message.success(`Module "${mod.display_name}" installed successfully`);
          await loadModules();
          if (selectedModule.value?.name === mod.name) {
            selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
          }
        } else {
          message.error(result.message || 'Installation failed');
        }
      } catch (error) {
        message.error(error.message || 'Failed to install module');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

async function handleUninstall(mod) {
  Modal.confirm({
    title: 'Uninstall Module',
    content: `Are you sure you want to uninstall "${mod.display_name}"? This may affect other modules that depend on it.`,
    icon: h(ExclamationCircleOutlined),
    okText: 'Uninstall',
    okType: 'danger',
    async onOk() {
      actionLoading.value = true;
      try {
        const result = await requestClient.post(`/modules/uninstall/${mod.name}`);
        if (result.success) {
          message.success(`Module "${mod.display_name}" uninstalled`);
          await loadModules();
          if (selectedModule.value?.name === mod.name) {
            selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
          }
        } else {
          message.error(result.message || 'Uninstallation failed');
        }
      } catch (error) {
        message.error(error.message || 'Failed to uninstall module');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

async function handleUpgrade(mod) {
  actionLoading.value = true;
  try {
    const result = await requestClient.post(`/modules/upgrade/${mod.name}`);
    if (result.success) {
      message.success(`Module "${mod.display_name}" upgraded successfully`);
      await loadModules();
      if (selectedModule.value?.name === mod.name) {
        selectedModule.value = modules.value.find((m) => m.name === mod.name) || null;
      }
    } else {
      message.error(result.message || 'Upgrade failed');
    }
  } catch (error) {
    message.error(error.message || 'Failed to upgrade module');
  } finally {
    actionLoading.value = false;
  }
}

const uploadProps = {
  name: 'file',
  accept: '.zip',
  showUploadList: false,
  customRequest: async (options) => {
    const { file, onSuccess, onError } = options;
    uploadLoading.value = true;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await requestClient.post('/modules/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (result.success) {
        message.success(`Module "${result.module?.display_name}" uploaded and installed`);
        showUploadModal.value = false;
        await loadModules();
        onSuccess?.(result);
      } else {
        message.error(result.message || 'Upload failed');
        onError?.(new Error(result.message));
      }
    } catch (error) {
      message.error(error.message || 'Failed to upload module');
      onError?.(error);
    } finally {
      uploadLoading.value = false;
    }
  },
};

function getStateColor(state) {
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

function getStateText(state) {
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

function canUninstall(mod) {
  return mod.state === 'installed' && mod.name !== 'base';
}

function formatDate(dateStr) {
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
  <Page auto-content-height>
    <div class="modules-page p-4">
      <!-- Header -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold mb-1">
            <AppstoreOutlined class="mr-2" />
            Modules
          </h1>
          <p class="text-gray-500 m-0">
            Manage installed modules and discover new ones
          </p>
        </div>
        <Space>
          <RadioGroup v-model:value="viewMode" button-style="solid">
            <RadioButton value="grid">
              <TableOutlined /> Grid
            </RadioButton>
            <RadioButton value="list">
              <OrderedListOutlined /> List
            </RadioButton>
          </RadioGroup>
          <Button @click="loadModules">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
          <Button type="primary" @click="showUploadModal = true">
            <template #icon><CloudUploadOutlined /></template>
            Upload Module
          </Button>
        </Space>
      </div>

      <!-- Stats -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="6">
          <Card size="small">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-500">
                {{ modules.length }}
              </div>
              <div class="text-gray-500">Total Modules</div>
            </div>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <div class="text-center">
              <div class="text-2xl font-bold text-green-500">
                {{ installedCount }}
              </div>
              <div class="text-gray-500">Installed</div>
            </div>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-500">
                {{ applicationModules.length }}
              </div>
              <div class="text-gray-500">Applications</div>
            </div>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <div class="text-center">
              <div class="text-2xl font-bold text-orange-500">
                {{ categories.length }}
              </div>
              <div class="text-gray-500">Categories</div>
            </div>
          </Card>
        </Col>
      </Row>

      <!-- Filters -->
      <Card class="mb-6">
        <Row :gutter="[16, 16]">
          <Col :xs="24" :sm="8">
            <Input
              v-model:value="searchQuery"
              placeholder="Search modules..."
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
          </Col>
          <Col :xs="12" :sm="8">
            <Select
              v-model:value="categoryFilter"
              placeholder="Filter by category"
              allow-clear
              style="width: 100%"
            >
              <SelectOption v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </SelectOption>
            </Select>
          </Col>
          <Col :xs="12" :sm="8">
            <Select
              v-model:value="stateFilter"
              placeholder="Filter by state"
              allow-clear
              style="width: 100%"
            >
              <SelectOption value="installed">Installed</SelectOption>
              <SelectOption value="uninstalled">Not Installed</SelectOption>
              <SelectOption value="to_upgrade">Needs Upgrade</SelectOption>
            </Select>
          </Col>
        </Row>
      </Card>

      <!-- Module Content -->
      <Spin :spinning="loading">
        <!-- List View -->
        <Card v-if="viewMode === 'list'">
          <Table
            :columns="tableColumns"
            :data-source="filteredModules"
            :pagination="{ pageSize: 20, showSizeChanger: true }"
            :scroll="{ x: 1000 }"
            row-key="name"
          >
            <template #bodyCell="{ column, record }">
              <!-- Module Name & Summary -->
              <template v-if="column.key === 'module'">
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-lg flex items-center justify-center"
                    :class="record.application ? 'bg-purple-100' : 'bg-blue-100'"
                  >
                    <AppstoreOutlined
                      v-if="record.application"
                      class="text-purple-500 text-lg"
                    />
                    <SettingOutlined v-else class="text-blue-500 text-lg" />
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
                <Tag :color="record.application ? 'purple' : 'blue'">
                  {{ record.application ? 'App' : 'Technical' }}
                </Tag>
              </template>

              <!-- State -->
              <template v-else-if="column.key === 'state'">
                <Badge
                  :status="getStateColor(record.state)"
                  :text="getStateText(record.state)"
                />
              </template>

              <!-- Actions -->
              <template v-else-if="column.key === 'actions'">
                <Space>
                  <Tooltip title="View Details">
                    <Button
                      type="text"
                      size="small"
                      @click="openModuleDetail(record)"
                    >
                      <EyeOutlined />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    v-if="record.state !== 'installed'"
                    title="Install"
                  >
                    <Button
                      type="text"
                      size="small"
                      @click="handleInstall(record)"
                    >
                      <CloudDownloadOutlined class="text-green-500" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    v-if="record.state === 'installed'"
                    title="Upgrade"
                  >
                    <Button
                      type="text"
                      size="small"
                      @click="handleUpgrade(record)"
                    >
                      <SyncOutlined class="text-blue-500" />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    v-if="canUninstall(record)"
                    title="Uninstall"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      @click="handleUninstall(record)"
                    >
                      <DeleteOutlined />
                    </Button>
                  </Tooltip>
                </Space>
              </template>
            </template>
          </Table>
        </Card>

        <!-- Grid View -->
        <template v-else>
          <!-- Applications Section -->
          <div v-if="applicationModules.length > 0" class="mb-6">
            <h2 class="text-lg font-semibold mb-4">
              <AppstoreOutlined class="mr-2" />
              Applications
            </h2>
            <Row :gutter="[16, 16]">
              <Col
                v-for="mod in applicationModules"
                :key="mod.name"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
              >
                <Card
                  hoverable
                  :class="{
                    'border-green-400': mod.state === 'installed',
                    'opacity-60': mod.state === 'uninstalled',
                  }"
                  @click="openModuleDetail(mod)"
                >
                  <template #title>
                    <div class="flex items-center justify-between">
                      <span class="truncate" :title="mod.display_name">
                        {{ mod.display_name }}
                      </span>
                      <Badge
                        :status="getStateColor(mod.state)"
                        :text="getStateText(mod.state)"
                      />
                    </div>
                  </template>
                  <template #extra>
                    <Dropdown @click.stop>
                      <Button size="small" type="text">
                        <DownOutlined />
                      </Button>
                      <template #overlay>
                        <Menu>
                          <MenuItem key="view" @click="openModuleDetail(mod)">
                            <EyeOutlined /> View Details
                          </MenuItem>
                          <MenuItem
                            v-if="mod.state !== 'installed'"
                            key="install"
                            @click="handleInstall(mod)"
                          >
                            <CloudDownloadOutlined /> Install
                          </MenuItem>
                          <MenuItem
                            v-if="mod.state === 'installed'"
                            key="upgrade"
                            @click="handleUpgrade(mod)"
                          >
                            <SyncOutlined /> Upgrade
                          </MenuItem>
                          <MenuItem
                            v-if="canUninstall(mod)"
                            key="uninstall"
                            danger
                            @click="handleUninstall(mod)"
                          >
                            <DeleteOutlined /> Uninstall
                          </MenuItem>
                        </Menu>
                      </template>
                    </Dropdown>
                  </template>

                  <p class="text-gray-500 text-sm mb-3 line-clamp-2">
                    {{ mod.summary || 'No description available' }}
                  </p>

                  <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>v{{ mod.version }}</span>
                    <Tag v-if="mod.category" size="small">
                      {{ mod.category }}
                    </Tag>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>

          <!-- Technical Modules Section -->
          <div v-if="technicalModules.length > 0">
            <h2 class="text-lg font-semibold mb-4">
              <SettingOutlined class="mr-2" />
              Technical Modules
            </h2>
            <Row :gutter="[16, 16]">
              <Col
                v-for="mod in technicalModules"
                :key="mod.name"
                :xs="24"
                :sm="12"
                :md="8"
                :lg="6"
              >
                <Card
                  size="small"
                  hoverable
                  :class="{
                    'border-green-400': mod.state === 'installed',
                    'opacity-60': mod.state === 'uninstalled',
                  }"
                  @click="openModuleDetail(mod)"
                >
                  <template #title>
                    <div class="flex items-center gap-2">
                      <CheckCircleOutlined
                        v-if="mod.state === 'installed'"
                        class="text-green-500"
                      />
                      <InfoCircleOutlined v-else class="text-gray-400" />
                      <span class="truncate text-sm" :title="mod.display_name">
                        {{ mod.display_name }}
                      </span>
                    </div>
                  </template>
                  <template #extra>
                    <Dropdown @click.stop>
                      <Button size="small" type="text">
                        <DownOutlined />
                      </Button>
                      <template #overlay>
                        <Menu>
                          <MenuItem key="view" @click="openModuleDetail(mod)">
                            <EyeOutlined /> View Details
                          </MenuItem>
                          <MenuItem
                            v-if="mod.state !== 'installed'"
                            key="install"
                            @click="handleInstall(mod)"
                          >
                            <CloudDownloadOutlined /> Install
                          </MenuItem>
                          <MenuItem
                            v-if="mod.state === 'installed'"
                            key="upgrade"
                            @click="handleUpgrade(mod)"
                          >
                            <SyncOutlined /> Upgrade
                          </MenuItem>
                          <MenuItem
                            v-if="canUninstall(mod)"
                            key="uninstall"
                            danger
                            @click="handleUninstall(mod)"
                          >
                            <DeleteOutlined /> Uninstall
                          </MenuItem>
                        </Menu>
                      </template>
                    </Dropdown>
                  </template>

                  <p class="text-gray-500 text-xs mb-2 line-clamp-2">
                    {{ mod.summary || 'No description' }}
                  </p>

                  <div class="flex items-center justify-between text-xs text-gray-400">
                    <span>v{{ mod.version }}</span>
                    <span v-if="mod.author">{{ mod.author }}</span>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </template>

        <!-- Empty State -->
        <AEmpty
          v-if="!loading && filteredModules.length === 0"
          description="No modules found"
        >
          <Button type="primary" @click="showUploadModal = true">
            <template #icon><UploadOutlined /></template>
            Upload Your First Module
          </Button>
        </AEmpty>
      </Spin>

      <!-- Module Detail Drawer -->
      <Drawer
        v-model:open="showDetailDrawer"
        :title="selectedModule?.display_name || 'Module Details'"
        width="600"
        placement="right"
        @close="closeDetailDrawer"
      >
        <template v-if="selectedModule">
          <Spin :spinning="actionLoading">
            <!-- Module Header -->
            <div class="mb-6">
              <div class="flex items-start gap-4 mb-4">
                <div
                  class="w-16 h-16 rounded-xl flex items-center justify-center"
                  :class="selectedModule.application ? 'bg-purple-100' : 'bg-blue-100'"
                >
                  <AppstoreOutlined
                    v-if="selectedModule.application"
                    class="text-purple-500 text-2xl"
                  />
                  <SettingOutlined v-else class="text-blue-500 text-2xl" />
                </div>
                <div class="flex-1">
                  <h2 class="text-xl font-semibold m-0">
                    {{ selectedModule.display_name }}
                  </h2>
                  <div class="flex items-center gap-2 mt-1">
                    <Tag :color="selectedModule.application ? 'purple' : 'blue'">
                      {{ selectedModule.application ? 'Application' : 'Technical' }}
                    </Tag>
                    <Badge
                      :status="getStateColor(selectedModule.state)"
                      :text="getStateText(selectedModule.state)"
                    />
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <Space class="w-full" direction="vertical">
                <div class="flex gap-2">
                  <Button
                    v-if="selectedModule.state !== 'installed'"
                    type="primary"
                    block
                    :loading="actionLoading"
                    @click="handleInstall(selectedModule)"
                  >
                    <template #icon><CloudDownloadOutlined /></template>
                    Install Module
                  </Button>
                  <template v-else>
                    <Button
                      block
                      :loading="actionLoading"
                      @click="handleUpgrade(selectedModule)"
                    >
                      <template #icon><SyncOutlined /></template>
                      Upgrade
                    </Button>
                    <Button
                      v-if="canUninstall(selectedModule)"
                      danger
                      block
                      :loading="actionLoading"
                      @click="handleUninstall(selectedModule)"
                    >
                      <template #icon><DeleteOutlined /></template>
                      Uninstall
                    </Button>
                  </template>
                </div>
                <Alert
                  v-if="selectedModule.name === 'base'"
                  type="info"
                  show-icon
                  message="Core Module"
                  description="The base module is required for the system to function and cannot be uninstalled."
                />
              </Space>
            </div>

            <!-- Summary -->
            <div v-if="selectedModule.summary" class="mb-6">
              <TypographyParagraph class="text-gray-600">
                {{ selectedModule.summary }}
              </TypographyParagraph>
            </div>

            <!-- Description -->
            <div v-if="selectedModule.description" class="mb-6">
              <h3 class="text-sm font-semibold text-gray-500 mb-2">Description</h3>
              <TypographyParagraph class="text-gray-600 whitespace-pre-wrap">
                {{ selectedModule.description }}
              </TypographyParagraph>
            </div>

            <!-- Module Info -->
            <Descriptions
              :column="1"
              bordered
              size="small"
              class="mb-6"
            >
              <DescriptionsItem label="Technical Name">
                <code>{{ selectedModule.name }}</code>
              </DescriptionsItem>
              <DescriptionsItem label="Version">
                {{ selectedModule.version }}
              </DescriptionsItem>
              <DescriptionsItem label="Category">
                <Tag>{{ selectedModule.category || 'Uncategorized' }}</Tag>
              </DescriptionsItem>
              <DescriptionsItem label="License">
                {{ selectedModule.license || 'MIT' }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedModule.author" label="Author">
                {{ selectedModule.author }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedModule.website" label="Website">
                <a :href="selectedModule.website" target="_blank" rel="noopener noreferrer">
                  {{ selectedModule.website }}
                </a>
              </DescriptionsItem>
              <DescriptionsItem label="Installed At">
                {{ formatDate(selectedModule.installed_at) }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedModule.module_path" label="Path">
                <code class="text-xs">{{ selectedModule.module_path }}</code>
              </DescriptionsItem>
            </Descriptions>

            <!-- Dependencies -->
            <div v-if="selectedModule.depends && selectedModule.depends.length > 0" class="mb-6">
              <h3 class="text-sm font-semibold text-gray-500 mb-2">Dependencies</h3>
              <div class="flex flex-wrap gap-2">
                <Tag v-for="dep in selectedModule.depends" :key="dep" color="blue">
                  {{ dep }}
                </Tag>
              </div>
            </div>

            <!-- Auto Install -->
            <div v-if="selectedModule.auto_install" class="mb-4">
              <Alert
                type="success"
                show-icon
                message="Auto-install Enabled"
                description="This module will be automatically installed when all dependencies are met."
              />
            </div>
          </Spin>
        </template>
      </Drawer>

      <!-- Upload Modal -->
      <Modal
        v-model:open="showUploadModal"
        title="Upload Module"
        :footer="null"
        :destroy-on-close="true"
      >
        <Alert
          class="mb-4"
          type="info"
          show-icon
          message="Upload a module ZIP file"
          description="The ZIP file should contain a valid module with __manifest__.py and __init__.py files."
        />

        <UploadDragger v-bind="uploadProps" :disabled="uploadLoading">
          <p class="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p class="ant-upload-text">
            Click or drag module ZIP file to this area
          </p>
          <p class="ant-upload-hint">
            Support for single ZIP file upload. The module will be extracted and
            installed automatically.
          </p>
        </UploadDragger>

        <Spin v-if="uploadLoading" class="mt-4" tip="Installing module..." />
      </Modal>
    </div>
  </Page>
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
  border-color: #52c41a;
}

:deep(.ant-card-head-title) {
  font-size: 14px;
}
</style>
