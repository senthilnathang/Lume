<script setup>
/**
 * Sharing Rules View
 *
 * Manage automatic sharing rules based on ownership or criteria.
 * Sharing rules extend access beyond organization-wide defaults.
 */

import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import {
  ShareAltOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { ref, reactive, onMounted, computed, watch } from 'vue';
import { useNotification } from '#/composables';
import {
  getSharingRulesApi,
  getSharingRuleApi,
  createSharingRuleApi,
  updateSharingRuleApi,
  deleteSharingRuleApi,
  RULE_TYPES,
  SHARING_ACCESS_LEVELS,
} from '#/api/base_security';

defineOptions({ name: 'BaseSharingRules' });

const { showSuccess, showError } = useNotification();

// State
const loading = ref(false);
const actionLoading = ref(false);
const data = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showTotal: (total) => `Total ${total} rules`,
});
const filters = reactive({
  object_name: null,
  rule_type: null,
  is_active: null,
});
const modalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);

// Available objects for filter (would normally come from API)
const availableObjects = ref([
  { value: 'Employee', label: 'Employee' },
  { value: 'Department', label: 'Department' },
  { value: 'Leave', label: 'Leave Request' },
  { value: 'Attendance', label: 'Attendance' },
  { value: 'Payroll', label: 'Payroll' },
  { value: 'Course', label: 'Course' },
  { value: 'Project', label: 'Project' },
  { value: 'Task', label: 'Task' },
]);

// Available roles (would normally come from API)
const availableRoles = ref([
  { value: 1, label: 'CEO' },
  { value: 2, label: 'Manager' },
  { value: 3, label: 'Team Lead' },
  { value: 4, label: 'Employee' },
  { value: 5, label: 'HR Admin' },
]);

// Form state
const form = reactive({
  name: '',
  api_name: '',
  description: '',
  object_name: '',
  rule_type: 'ownership',
  source_role_id: null,
  source_include_subordinates: true,
  target_role_id: null,
  target_include_subordinates: true,
  target_group_id: null,
  access_level: 'read',
  criteria_domain: '',
  sequence: 10,
  is_active: true,
});

// Rule type options
const ruleTypeOptions = RULE_TYPES.map(t => ({
  value: t.value,
  label: t.label,
}));

// Access level options
const accessLevelOptions = SHARING_ACCESS_LEVELS.map(a => ({
  value: a.value,
  label: a.label,
}));

// Table columns
const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Object',
    dataIndex: 'object_name',
    key: 'object_name',
    width: 120,
  },
  {
    title: 'Rule Type',
    dataIndex: 'rule_type',
    key: 'rule_type',
    width: 130,
  },
  {
    title: 'Shared From',
    key: 'source',
    width: 180,
  },
  {
    title: 'Shared To',
    key: 'target',
    width: 180,
  },
  {
    title: 'Access Level',
    dataIndex: 'access_level',
    key: 'access_level',
    width: 120,
    align: 'center',
  },
  {
    title: 'Status',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 100,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    align: 'center',
    fixed: 'right',
  },
];

// Get rule type config
function getRuleTypeConfig(type) {
  return RULE_TYPES.find(t => t.value === type) || { label: type, color: 'default' };
}

// Get access level config
function getAccessLevelConfig(level) {
  return SHARING_ACCESS_LEVELS.find(a => a.value === level) || { label: level, color: 'default' };
}

// Get role label
function getRoleLabel(roleId) {
  const role = availableRoles.value.find(r => r.value === roleId);
  return role ? role.label : `Role ${roleId}`;
}

// Fetch data
async function fetchData() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.object_name) params.object_name = filters.object_name;
    if (filters.rule_type) params.rule_type = filters.rule_type;
    if (filters.is_active !== null) params.is_active = filters.is_active;

    const res = await getSharingRulesApi(params);
    data.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load sharing rules');
    console.error(err);
  } finally {
    loading.value = false;
  }
}

// Handle table change
function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchData();
}

// Open create modal
function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  Object.assign(form, {
    name: '',
    api_name: '',
    description: '',
    object_name: '',
    rule_type: 'ownership',
    source_role_id: null,
    source_include_subordinates: true,
    target_role_id: null,
    target_include_subordinates: true,
    target_group_id: null,
    access_level: 'read',
    criteria_domain: '',
    sequence: 10,
    is_active: true,
  });
  modalVisible.value = true;
}

// Open edit modal
async function openEditModal(record) {
  isEditing.value = true;
  editingId.value = record.id;

  try {
    actionLoading.value = true;
    const detail = await getSharingRuleApi(record.id);
    Object.assign(form, {
      name: detail.name || '',
      api_name: detail.api_name || '',
      description: detail.description || '',
      object_name: detail.object_name || '',
      rule_type: detail.rule_type || 'ownership',
      source_role_id: detail.source_role_id || null,
      source_include_subordinates: detail.source_include_subordinates !== false,
      target_role_id: detail.target_role_id || null,
      target_include_subordinates: detail.target_include_subordinates !== false,
      target_group_id: detail.target_group_id || null,
      access_level: detail.access_level || 'read',
      criteria_domain: detail.criteria_domain ? JSON.stringify(detail.criteria_domain, null, 2) : '',
      sequence: detail.sequence || 10,
      is_active: detail.is_active !== false,
    });
    modalVisible.value = true;
  } catch (err) {
    showError('Failed to load sharing rule details');
  } finally {
    actionLoading.value = false;
  }
}

// Save rule
async function saveRule() {
  if (!form.name || !form.object_name) {
    showError('Name and Object are required');
    return;
  }

  actionLoading.value = true;
  try {
    const payload = {
      name: form.name,
      api_name: form.api_name || form.name.toLowerCase().replace(/\s+/g, '_'),
      description: form.description,
      object_name: form.object_name,
      rule_type: form.rule_type,
      source_role_id: form.source_role_id,
      source_include_subordinates: form.source_include_subordinates,
      target_role_id: form.target_role_id,
      target_include_subordinates: form.target_include_subordinates,
      target_group_id: form.target_group_id,
      access_level: form.access_level,
      sequence: form.sequence,
      is_active: form.is_active,
    };

    // Parse criteria domain if provided
    if (form.criteria_domain) {
      try {
        payload.criteria_domain = JSON.parse(form.criteria_domain);
      } catch (e) {
        showError('Invalid criteria domain JSON');
        actionLoading.value = false;
        return;
      }
    }

    if (isEditing.value) {
      await updateSharingRuleApi(editingId.value, payload);
      showSuccess('Sharing rule updated');
    } else {
      await createSharingRuleApi(payload);
      showSuccess('Sharing rule created');
    }
    modalVisible.value = false;
    await fetchData();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to save sharing rule');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

// Delete rule
async function deleteRule(record) {
  try {
    actionLoading.value = true;
    await deleteSharingRuleApi(record.id);
    showSuccess('Sharing rule deleted');
    await fetchData();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete sharing rule');
  } finally {
    actionLoading.value = false;
  }
}

// Auto-generate API name
watch(() => form.name, (newName) => {
  if (!isEditing.value && newName) {
    form.api_name = newName.toLowerCase().replace(/\s+/g, '_');
  }
});

// Reset filters
function resetFilters() {
  filters.object_name = null;
  filters.rule_type = null;
  filters.is_active = null;
  pagination.value.current = 1;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <Card>
        <template #title>
          <div class="flex items-center">
            <ShareAltOutlined class="mr-2 text-lg" />
            <span>Sharing Rules</span>
          </div>
        </template>
        <template #extra>
          <Space>
            <Button @click="fetchData" :loading="loading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              New Sharing Rule
            </Button>
          </Space>
        </template>

        <!-- Info Alert -->
        <Alert
          class="mb-4"
          type="info"
          show-icon
          message="Sharing Rules extend access to records beyond Organization-Wide Defaults. They grant additional read or read/write access to records based on ownership or criteria."
        />

        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-4">
          <Select
            v-model:value="filters.object_name"
            placeholder="Filter by Object"
            style="width: 180px"
            allowClear
            @change="() => { pagination.current = 1; fetchData(); }"
          >
            <SelectOption
              v-for="obj in availableObjects"
              :key="obj.value"
              :value="obj.value"
            >
              {{ obj.label }}
            </SelectOption>
          </Select>

          <Select
            v-model:value="filters.rule_type"
            placeholder="Filter by Type"
            style="width: 160px"
            allowClear
            @change="() => { pagination.current = 1; fetchData(); }"
          >
            <SelectOption
              v-for="type in ruleTypeOptions"
              :key="type.value"
              :value="type.value"
            >
              {{ type.label }}
            </SelectOption>
          </Select>

          <Select
            v-model:value="filters.is_active"
            placeholder="Status"
            style="width: 120px"
            allowClear
            @change="() => { pagination.current = 1; fetchData(); }"
          >
            <SelectOption :value="true">Active</SelectOption>
            <SelectOption :value="false">Inactive</SelectOption>
          </Select>

          <Button @click="resetFilters">
            <template #icon><FilterOutlined /></template>
            Reset
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :dataSource="data"
          :pagination="pagination"
          :loading="loading"
          @change="handleTableChange"
          rowKey="id"
          size="middle"
          :scroll="{ x: 1200 }"
        >
          <template #bodyCell="{ column, record }">
            <!-- Name -->
            <template v-if="column.key === 'name'">
              <div class="font-medium">{{ record.name }}</div>
              <div class="text-xs text-gray-400">{{ record.api_name }}</div>
            </template>

            <!-- Rule Type -->
            <template v-else-if="column.key === 'rule_type'">
              <Tag :color="getRuleTypeConfig(record.rule_type).color">
                {{ getRuleTypeConfig(record.rule_type).label }}
              </Tag>
            </template>

            <!-- Source -->
            <template v-else-if="column.key === 'source'">
              <template v-if="record.rule_type === 'ownership'">
                <div class="flex items-center">
                  <TeamOutlined class="mr-1" />
                  <span>{{ getRoleLabel(record.source_role_id) }}</span>
                </div>
                <div v-if="record.source_include_subordinates" class="text-xs text-gray-400">
                  + subordinates
                </div>
              </template>
              <template v-else>
                <Tag color="purple">Criteria-based</Tag>
              </template>
            </template>

            <!-- Target -->
            <template v-else-if="column.key === 'target'">
              <div class="flex items-center">
                <TeamOutlined class="mr-1" />
                <span>{{ getRoleLabel(record.target_role_id) }}</span>
              </div>
              <div v-if="record.target_include_subordinates" class="text-xs text-gray-400">
                + subordinates
              </div>
            </template>

            <!-- Access Level -->
            <template v-else-if="column.key === 'access_level'">
              <Tag :color="getAccessLevelConfig(record.access_level).color">
                {{ getAccessLevelConfig(record.access_level).label }}
              </Tag>
            </template>

            <!-- Status -->
            <template v-else-if="column.key === 'is_active'">
              <Tag :color="record.is_active ? 'green' : 'default'">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>

            <!-- Actions -->
            <template v-else-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Edit">
                  <Button
                    type="text"
                    size="small"
                    @click="openEditModal(record)"
                  >
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this sharing rule?"
                  @confirm="deleteRule(record)"
                  okText="Delete"
                  okType="danger"
                >
                  <Tooltip title="Delete">
                    <Button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>
    </Spin>

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="isEditing ? 'Edit Sharing Rule' : 'New Sharing Rule'"
      :confirmLoading="actionLoading"
      @ok="saveRule"
      width="700px"
    >
      <Form layout="vertical" class="mt-4">
        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Name" required>
            <Input v-model:value="form.name" placeholder="Enter rule name" />
          </FormItem>

          <FormItem label="API Name">
            <Input v-model:value="form.api_name" placeholder="Auto-generated" />
          </FormItem>
        </div>

        <FormItem label="Description">
          <Textarea
            v-model:value="form.description"
            placeholder="Describe when this rule applies"
            :rows="2"
          />
        </FormItem>

        <div class="grid grid-cols-2 gap-4">
          <FormItem label="Object" required>
            <Select
              v-model:value="form.object_name"
              placeholder="Select object"
              :options="availableObjects"
            />
          </FormItem>

          <FormItem label="Rule Type" required>
            <Select
              v-model:value="form.rule_type"
              :options="ruleTypeOptions"
            />
          </FormItem>
        </div>

        <!-- Ownership-based rule configuration -->
        <template v-if="form.rule_type === 'ownership'">
          <Alert
            class="mb-4"
            type="info"
            message="Ownership Rule: Share records owned by users in the source role with users in the target role."
          />

          <div class="grid grid-cols-2 gap-4">
            <FormItem label="Records Owned By (Source Role)">
              <Select
                v-model:value="form.source_role_id"
                placeholder="Select source role"
                :options="availableRoles"
                allowClear
              />
              <div class="mt-2">
                <Switch v-model:checked="form.source_include_subordinates" size="small" />
                <span class="ml-2 text-sm">Include subordinates</span>
              </div>
            </FormItem>

            <FormItem label="Share With (Target Role)">
              <Select
                v-model:value="form.target_role_id"
                placeholder="Select target role"
                :options="availableRoles"
                allowClear
              />
              <div class="mt-2">
                <Switch v-model:checked="form.target_include_subordinates" size="small" />
                <span class="ml-2 text-sm">Include subordinates</span>
              </div>
            </FormItem>
          </div>
        </template>

        <!-- Criteria-based rule configuration -->
        <template v-else>
          <Alert
            class="mb-4"
            type="info"
            message="Criteria Rule: Share records matching specific criteria with users in the target role."
          />

          <FormItem label="Share With (Target Role)">
            <Select
              v-model:value="form.target_role_id"
              placeholder="Select target role"
              :options="availableRoles"
              allowClear
            />
            <div class="mt-2">
              <Switch v-model:checked="form.target_include_subordinates" size="small" />
              <span class="ml-2 text-sm">Include subordinates</span>
            </div>
          </FormItem>

          <FormItem label="Criteria (JSON Domain)">
            <Textarea
              v-model:value="form.criteria_domain"
              placeholder='[["field_name", "=", "value"]]'
              :rows="4"
              class="font-mono"
            />
            <div class="text-xs text-gray-400 mt-1">
              Enter criteria in JSON array format. Example: [["status", "=", "approved"]]
            </div>
          </FormItem>
        </template>

        <div class="grid grid-cols-3 gap-4">
          <FormItem label="Access Level" required>
            <Select
              v-model:value="form.access_level"
              :options="accessLevelOptions"
            />
          </FormItem>

          <FormItem label="Sequence">
            <InputNumber
              v-model:value="form.sequence"
              :min="1"
              :max="999"
              style="width: 100%"
            />
          </FormItem>

          <FormItem label="Status">
            <Switch v-model:checked="form.is_active" />
            <span class="ml-2">{{ form.is_active ? 'Active' : 'Inactive' }}</span>
          </FormItem>
        </div>
      </Form>
    </Modal>
  </Page>
</template>
