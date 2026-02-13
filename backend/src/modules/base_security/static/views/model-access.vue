<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Drawer,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  message,
  DescriptionsItem,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  KeyOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined,
  TeamOutlined } from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';

defineOptions({
  name: 'BaseModelAccess' });

const loading = ref(false);
const accessRules = ref([]);
const contentTypes = ref([]);
const groups = ref([]);
const modules = ref([]);

const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0 });

const filters = ref({
  search: '',
  module: null,
  model_name: null,
  group_id: null });

const stats = ref({
  total_rules: 0,
  active_rules: 0,
  models_covered: 0,
  groups_covered: 0 });

// Modal states
const accessModalVisible = ref(false);
const viewDrawerVisible = ref(false);
const isEditing = ref(false);
const selectedAccess = ref(null);

const formData = ref({
  name: '',
  content_type_id: null,
  group_id: null,
  module: '',
  perm_read: true,
  perm_write: false,
  perm_create: false,
  perm_unlink: false,
  is_active: true });

const columns = [
  { title: 'Rule Name', dataIndex: 'name', key: 'name', width: 200, fixed: 'left' },
  { title: 'Model', key: 'model', width: 200 },
  { title: 'Group', key: 'group', width: 150 },
  { title: 'Module', dataIndex: 'module', key: 'module', width: 120 },
  { title: 'Read', key: 'perm_read', width: 70, align: 'center' },
  { title: 'Write', key: 'perm_write', width: 70, align: 'center' },
  { title: 'Create', key: 'perm_create', width: 70, align: 'center' },
  { title: 'Delete', key: 'perm_unlink', width: 70, align: 'center' },
  { title: 'Active', key: 'is_active', width: 70, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

const filteredRules = computed(() => {
  let result = [...accessRules.value];

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(search) ||
        r.model_name?.toLowerCase().includes(search) ||
        r.group_name?.toLowerCase().includes(search),
    );
  }

  return result;
});

async function fetchAccessRules() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize };

    if (filters.value.module) params.module = filters.value.module;
    if (filters.value.model_name) params.model_name = filters.value.model_name;
    if (filters.value.group_id) params.group_id = filters.value.group_id;

    const response = await requestClient.get('/model-access/', { params });
    accessRules.value = response || [];
    calculateStats();
  } catch (error) {
    console.error('Failed to fetch access rules:', error);
    message.error('Failed to load model access rules');
  } finally {
    loading.value = false;
  }
}

async function fetchContentTypes() {
  try {
    const response = await requestClient.get('/content-types/');
    contentTypes.value = response.items || response || [];
  } catch (error) {
    console.error('Failed to fetch content types:', error);
  }
}

async function fetchGroups() {
  try {
    const response = await requestClient.get('/groups/');
    groups.value = response.items || response || [];
  } catch (error) {
    console.error('Failed to fetch groups:', error);
  }
}

async function fetchModules() {
  try {
    const response = await requestClient.get('/modules/installed');
    modules.value = (response.items || response || []).map((m) => m.name || m);
  } catch (error) {
    console.error('Failed to fetch modules:', error);
  }
}

function calculateStats() {
  const rules = accessRules.value;
  stats.value = {
    total_rules: rules.length,
    active_rules: rules.filter((r) => r.is_active).length,
    models_covered: new Set(rules.map((r) => r.content_type_id)).size,
    groups_covered: new Set(rules.filter((r) => r.group_id).map((r) => r.group_id)).size };
}

async function saveAccessRule() {
  if (!formData.value.name.trim()) {
    message.warning('Please enter a rule name');
    return;
  }

  if (!formData.value.content_type_id) {
    message.warning('Please select a model');
    return;
  }

  try {
    if (isEditing.value && selectedAccess.value) {
      await requestClient.put(`/model-access/${selectedAccess.value.id}`, formData.value);
      message.success('Access rule updated');
    } else {
      await requestClient.post('/model-access/', formData.value);
      message.success('Access rule created');
    }

    accessModalVisible.value = false;
    resetForm();
    fetchAccessRules();
  } catch (error) {
    console.error('Failed to save access rule:', error);
    message.error(error.response?.data?.detail || 'Failed to save access rule');
  }
}

async function deleteAccessRule(id) {
  try {
    await requestClient.delete(`/model-access/${id}`);
    message.success('Access rule deleted');
    fetchAccessRules();
  } catch (error) {
    console.error('Failed to delete access rule:', error);
    message.error('Failed to delete access rule');
  }
}

async function toggleActive(rule) {
  try {
    await requestClient.put(`/model-access/${rule.id}`, {
      is_active: !rule.is_active });
    message.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
    fetchAccessRules();
  } catch (error) {
    console.error('Failed to toggle rule:', error);
    message.error('Failed to update rule');
  }
}

function resetForm() {
  formData.value = {
    name: '',
    content_type_id: null,
    group_id: null,
    module: '',
    perm_read: true,
    perm_write: false,
    perm_create: false,
    perm_unlink: false,
    is_active: true };
  isEditing.value = false;
  selectedAccess.value = null;
}

function openCreateModal() {
  resetForm();
  accessModalVisible.value = true;
}

function openEditModal(rule) {
  selectedAccess.value = rule;
  isEditing.value = true;
  formData.value = {
    name: rule.name,
    content_type_id: rule.content_type_id,
    group_id: rule.group_id,
    module: rule.module || '',
    perm_read: rule.perm_read,
    perm_write: rule.perm_write,
    perm_create: rule.perm_create,
    perm_unlink: rule.perm_unlink,
    is_active: rule.is_active };
  accessModalVisible.value = true;
}

function openViewDrawer(rule) {
  selectedAccess.value = rule;
  viewDrawerVisible.value = true;
}

function generateRuleName() {
  if (formData.value.content_type_id) {
    const ct = contentTypes.value.find((c) => c.id === formData.value.content_type_id);
    const group = formData.value.group_id
      ? groups.value.find((g) => g.id === formData.value.group_id)
      : null;

    if (ct) {
      const groupSuffix = group ? `.${group.name.toLowerCase().replace(/\s+/g, '_')}` : '.public';
      formData.value.name = `${ct.model}${groupSuffix}`;
    }
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchAccessRules();
}

function getModelLabel(contentTypeId) {
  const ct = contentTypes.value.find((c) => c.id === contentTypeId);
  return ct ? ct.model : `ID: ${contentTypeId}`;
}

onMounted(() => {
  fetchAccessRules();
  fetchContentTypes();
  fetchGroups();
  fetchModules();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Model Access Control</h1>
          <p class="text-gray-500">Manage CRUD permissions for models by group</p>
        </div>
        <Button type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Add Access Rule
        </Button>
      </div>

      <!-- Statistics -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic title="Total Rules" :value="stats.total_rules" :value-style="{ color: '#1890ff' }">
              <template #prefix><KeyOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic title="Active Rules" :value="stats.active_rules" :value-style="{ color: '#52c41a' }">
              <template #prefix><SafetyOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic title="Models Covered" :value="stats.models_covered" :value-style="{ color: '#722ed1' }">
              <template #prefix><LockOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic title="Groups Covered" :value="stats.groups_covered" :value-style="{ color: '#faad14' }">
              <template #prefix><TeamOutlined /></template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Card>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap items-center gap-4">
          <Input
            v-model:value="filters.search"
            placeholder="Search rules..."
            style="width: 250px"
            allow-clear
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="filters.module"
            placeholder="All Modules"
            style="width: 150px"
            allow-clear
            @change="fetchAccessRules"
          >
            <SelectOption v-for="mod in modules" :key="mod" :value="mod">
              {{ mod }}
            </SelectOption>
          </Select>
          <Select
            v-model:value="filters.group_id"
            placeholder="All Groups"
            style="width: 180px"
            allow-clear
            show-search
            option-filter-prop="label"
            @change="fetchAccessRules"
          >
            <SelectOption v-for="group in groups" :key="group.id" :value="group.id" :label="group.name">
              {{ group.name }}
            </SelectOption>
          </Select>
          <Button @click="fetchAccessRules">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="filteredRules"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1200 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'model'">
              <Tooltip :title="record.model_name || getModelLabel(record.content_type_id)">
                <Tag color="blue">{{ record.model_name || getModelLabel(record.content_type_id) }}</Tag>
              </Tooltip>
            </template>

            <template v-if="column.key === 'group'">
              <Tag v-if="record.group_name" color="purple">{{ record.group_name }}</Tag>
              <Tag v-else color="default">Public</Tag>
            </template>

            <template v-if="column.key === 'perm_read'">
              <CheckCircleOutlined v-if="record.perm_read" class="text-green-500" />
              <CloseCircleOutlined v-else class="text-gray-300" />
            </template>

            <template v-if="column.key === 'perm_write'">
              <CheckCircleOutlined v-if="record.perm_write" class="text-green-500" />
              <CloseCircleOutlined v-else class="text-gray-300" />
            </template>

            <template v-if="column.key === 'perm_create'">
              <CheckCircleOutlined v-if="record.perm_create" class="text-green-500" />
              <CloseCircleOutlined v-else class="text-gray-300" />
            </template>

            <template v-if="column.key === 'perm_unlink'">
              <CheckCircleOutlined v-if="record.perm_unlink" class="text-green-500" />
              <CloseCircleOutlined v-else class="text-gray-300" />
            </template>

            <template v-if="column.key === 'is_active'">
              <Switch :checked="record.is_active" size="small" @click="toggleActive(record)" />
            </template>

            <template v-if="column.key === 'actions'">
              <Space>
                <Button type="link" size="small" @click="openViewDrawer(record)">
                  <template #icon><EyeOutlined /></template>
                </Button>
                <Button type="link" size="small" @click="openEditModal(record)">
                  <template #icon><EditOutlined /></template>
                </Button>
                <Popconfirm title="Delete this rule?" @confirm="deleteAccessRule(record.id)">
                  <Button type="link" size="small" danger>
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="accessModalVisible"
        :title="isEditing ? 'Edit Access Rule' : 'Create Access Rule'"
        width="600px"
        @cancel="resetForm"
      >
        <Form layout="vertical" class="mt-4">
          <FormItem label="Model (Content Type)" required>
            <Select
              v-model:value="formData.content_type_id"
              placeholder="Select a model"
              show-search
              option-filter-prop="label"
              @change="generateRuleName"
            >
              <SelectOption
                v-for="ct in contentTypes"
                :key="ct.id"
                :value="ct.id"
                :label="ct.model"
              >
                <div class="flex items-center justify-between">
                  <span>{{ ct.model }}</span>
                  <span class="text-xs text-gray-400">{{ ct.app_label }}</span>
                </div>
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Group">
            <Select
              v-model:value="formData.group_id"
              placeholder="Public (All Users)"
              allow-clear
              show-search
              option-filter-prop="label"
              @change="generateRuleName"
            >
              <SelectOption v-for="group in groups" :key="group.id" :value="group.id" :label="group.name">
                {{ group.name }}
              </SelectOption>
            </Select>
            <div class="mt-1 text-xs text-gray-500">
              Leave empty for public access (all authenticated users)
            </div>
          </FormItem>

          <FormItem label="Rule Name" required>
            <Input v-model:value="formData.name" placeholder="e.g., employee.employees.manager" />
            <div class="mt-1 text-xs text-gray-500">
              Convention: model.group_name (auto-generated when selecting model and group)
            </div>
          </FormItem>

          <FormItem label="Module">
            <Select v-model:value="formData.module" placeholder="Select module" allow-clear>
              <SelectOption v-for="mod in modules" :key="mod" :value="mod">
                {{ mod }}
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Permissions">
            <Card size="small">
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-2">
                  <Checkbox v-model:checked="formData.perm_read" />
                  <span>Read</span>
                  <span class="text-xs text-gray-400">(View records)</span>
                </div>
                <div class="flex items-center gap-2">
                  <Checkbox v-model:checked="formData.perm_write" />
                  <span>Write</span>
                  <span class="text-xs text-gray-400">(Update records)</span>
                </div>
                <div class="flex items-center gap-2">
                  <Checkbox v-model:checked="formData.perm_create" />
                  <span>Create</span>
                  <span class="text-xs text-gray-400">(Add new records)</span>
                </div>
                <div class="flex items-center gap-2">
                  <Checkbox v-model:checked="formData.perm_unlink" />
                  <span>Delete</span>
                  <span class="text-xs text-gray-400">(Remove records)</span>
                </div>
              </div>
            </Card>
          </FormItem>

          <FormItem>
            <div class="flex items-center gap-2">
              <Switch v-model:checked="formData.is_active" />
              <span>Active</span>
            </div>
          </FormItem>
        </Form>

        <template #footer>
          <Button @click="accessModalVisible = false">Cancel</Button>
          <Button type="primary" @click="saveAccessRule">
            {{ isEditing ? 'Update' : 'Create' }}
          </Button>
        </template>
      </Modal>

      <!-- View Drawer -->
      <Drawer
        v-model:open="viewDrawerVisible"
        title="Access Rule Details"
        width="500px"
        placement="right"
      >
        <div v-if="selectedAccess" class="space-y-4">
          <Descriptions :column="1" bordered size="small">
            <DescriptionsItem label="Rule Name">{{ selectedAccess.name }}</DescriptionsItem>
            <DescriptionsItem label="Model">
              <Tag color="blue">{{ selectedAccess.model_name || getModelLabel(selectedAccess.content_type_id) }}</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="Group">
              <Tag v-if="selectedAccess.group_name" color="purple">{{ selectedAccess.group_name }}</Tag>
              <Tag v-else color="default">Public</Tag>
            </DescriptionsItem>
            <DescriptionsItem label="Module">{{ selectedAccess.module || '-' }}</DescriptionsItem>
            <DescriptionsItem label="Status">
              <Tag :color="selectedAccess.is_active ? 'green' : 'default'">
                {{ selectedAccess.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </DescriptionsItem>
          </Descriptions>

          <Card title="Permissions" size="small">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex items-center gap-2">
                <CheckCircleOutlined v-if="selectedAccess.perm_read" class="text-green-500" />
                <CloseCircleOutlined v-else class="text-red-500" />
                <span>Read</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircleOutlined v-if="selectedAccess.perm_write" class="text-green-500" />
                <CloseCircleOutlined v-else class="text-red-500" />
                <span>Write</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircleOutlined v-if="selectedAccess.perm_create" class="text-green-500" />
                <CloseCircleOutlined v-else class="text-red-500" />
                <span>Create</span>
              </div>
              <div class="flex items-center gap-2">
                <CheckCircleOutlined v-if="selectedAccess.perm_unlink" class="text-green-500" />
                <CloseCircleOutlined v-else class="text-red-500" />
                <span>Delete</span>
              </div>
            </div>
          </Card>
        </div>
      </Drawer>
    </div>
  </Page>
</template>
