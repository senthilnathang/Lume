<script setup>
/**
 * Assignment Rules View
 *
 * Manage automatic record assignment rules:
 * - Direct user assignment
 * - Load-based assignment
 * - Lookup field assignment
 * - Expression-based assignment
 * - Round-robin assignment
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
  Tooltip,
  TabPane,
} from 'ant-design-vue';
import {
  UserAddOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  SyncOutlined,
  HistoryOutlined,
} from '@ant-design/icons-vue';
import { ref, reactive, onMounted } from 'vue';
import { useNotification } from '#/composables';
import {
  getAssignmentRulesApi,
  deleteAssignmentRuleApi,
  createRoundRobinGroupApi,
  getRoundRobinGroupApi,
  updateRoundRobinGroupApi,
  deleteRoundRobinGroupApi,
  getAssignmentLogsApi,
  ASSIGNMENT_TYPES,
  ASSIGNMENT_TRIGGERS,
} from '#/api/base_automation';
import AssignmentRuleForm from './assignment-rules-form.vue';

defineOptions({ name: 'BaseAssignmentRules' });

const { showSuccess, showError } = useNotification();

// Form view state
const showForm = ref(false);
const editingRuleId = ref(null);

// Active tab
const activeTab = ref('rules');

// ============================================================================
// ASSIGNMENT RULES TAB
// ============================================================================

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
  model_name: null,
  assignment_type: null,
  is_active: null,
});

// Available models (would normally come from API)
const availableModels = ref([
  { value: 'Lead', label: 'Lead' },
  { value: 'Case', label: 'Case' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Task', label: 'Task' },
  { value: 'Employee', label: 'Employee' },
]);

// Available users (would come from API) - used by Round Robin Groups
const availableUsers = ref([
  { value: 1, label: 'John Smith' },
  { value: 2, label: 'Jane Doe' },
  { value: 3, label: 'Bob Wilson' },
  { value: 4, label: 'Alice Brown' },
]);

// Assignment type options
const assignmentTypeOptions = ASSIGNMENT_TYPES.map(t => ({
  value: t.value,
  label: t.label,
}));

// Table columns
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 120 },
  { title: 'Assignment Type', dataIndex: 'assignment_type', key: 'assignment_type', width: 150 },
  { title: 'Trigger', dataIndex: 'trigger_on', key: 'trigger_on', width: 100 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 80, align: 'center' },
  { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, align: 'center', fixed: 'right' },
];

// Get assignment type config
function getAssignmentTypeConfig(type) {
  const config = ASSIGNMENT_TYPES.find(t => t.value === type);
  return config || { label: type };
}

// Get trigger config
function getTriggerConfig(trigger) {
  const config = ASSIGNMENT_TRIGGERS.find(t => t.value === trigger);
  return config || { label: trigger };
}

// Fetch data
async function fetchData() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.model_name) params.model_name = filters.model_name;
    if (filters.assignment_type) params.assignment_type = filters.assignment_type;
    if (filters.is_active !== null) params.is_active = filters.is_active;

    const res = await getAssignmentRulesApi(params);
    data.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load assignment rules');
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

// Form view handlers
function openCreateForm() {
  editingRuleId.value = null;
  showForm.value = true;
}

function openEditForm(record) {
  editingRuleId.value = record.id;
  showForm.value = true;
}

function handleFormBack() {
  showForm.value = false;
  editingRuleId.value = null;
}

function handleFormSaved() {
  fetchData();
}

// Delete rule
async function deleteRule(record) {
  try {
    actionLoading.value = true;
    await deleteAssignmentRuleApi(record.id);
    showSuccess('Assignment rule deleted');
    await fetchData();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete assignment rule');
  } finally {
    actionLoading.value = false;
  }
}

// Reset filters
function resetFilters() {
  filters.model_name = null;
  filters.assignment_type = null;
  filters.is_active = null;
  pagination.value.current = 1;
  fetchData();
}

// ============================================================================
// ROUND-ROBIN GROUPS TAB
// ============================================================================

const rrGroupsLoading = ref(false);
const rrGroups = ref([]);
const rrGroupModalVisible = ref(false);
const isEditingRRGroup = ref(false);
const editingRRGroupName = ref(null);
const rrGroupForm = reactive({
  name: '',
  user_ids: [],
  current_index: 0,
});

const rrGroupColumns = [
  { title: 'Group Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Users', key: 'users', width: 300 },
  { title: 'Current Index', dataIndex: 'current_index', key: 'current_index', width: 120, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, align: 'center' },
];

async function fetchRRGroups() {
  rrGroupsLoading.value = true;
  try {
    // This would need a list endpoint - for now simulate
    rrGroups.value = [];
  } catch (err) {
    showError('Failed to load round-robin groups');
  } finally {
    rrGroupsLoading.value = false;
  }
}

function openCreateRRGroupModal() {
  isEditingRRGroup.value = false;
  editingRRGroupName.value = null;
  Object.assign(rrGroupForm, { name: '', user_ids: [], current_index: 0 });
  rrGroupModalVisible.value = true;
}

async function openEditRRGroupModal(record) {
  isEditingRRGroup.value = true;
  editingRRGroupName.value = record.name;
  try {
    const detail = await getRoundRobinGroupApi(record.name);
    Object.assign(rrGroupForm, {
      name: detail.name || '',
      user_ids: detail.user_ids || [],
      current_index: detail.current_index || 0,
    });
    rrGroupModalVisible.value = true;
  } catch (err) {
    showError('Failed to load round-robin group');
  }
}

async function saveRRGroup() {
  if (!rrGroupForm.name) {
    showError('Group name is required');
    return;
  }
  try {
    if (isEditingRRGroup.value) {
      await updateRoundRobinGroupApi(editingRRGroupName.value, rrGroupForm);
      showSuccess('Round-robin group updated');
    } else {
      await createRoundRobinGroupApi(rrGroupForm);
      showSuccess('Round-robin group created');
    }
    rrGroupModalVisible.value = false;
    await fetchRRGroups();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to save round-robin group');
  }
}

async function deleteRRGroup(record) {
  try {
    await deleteRoundRobinGroupApi(record.name);
    showSuccess('Round-robin group deleted');
    await fetchRRGroups();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to delete round-robin group');
  }
}

// ============================================================================
// LOGS TAB
// ============================================================================

const logsLoading = ref(false);
const logs = ref([]);
const logsPagination = ref({ current: 1, pageSize: 20, total: 0 });

const logColumns = [
  { title: 'Date', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: 'Rule', dataIndex: 'rule_name', key: 'rule_name', width: 150 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 120 },
  { title: 'Record ID', dataIndex: 'record_id', key: 'record_id', width: 100 },
  { title: 'Assigned To', dataIndex: 'assigned_to_name', key: 'assigned_to_name', width: 150 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100, align: 'center' },
];

async function fetchLogs() {
  logsLoading.value = true;
  try {
    const res = await getAssignmentLogsApi({
      page: logsPagination.value.current,
      page_size: logsPagination.value.pageSize,
    });
    logs.value = res.items || [];
    logsPagination.value.total = res.total || 0;
  } catch (err) {
    showError('Failed to load assignment logs');
  } finally {
    logsLoading.value = false;
  }
}

// ============================================================================
// TAB CHANGE HANDLER
// ============================================================================

function handleTabChange(key) {
  activeTab.value = key;
  if (key === 'rules') fetchData();
  else if (key === 'round-robin') fetchRRGroups();
  else if (key === 'logs') fetchLogs();
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <!-- Show Form View when creating/editing -->
  <AssignmentRuleForm
    v-if="showForm"
    :rule-id="editingRuleId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <Page v-else auto-content-height>
    <Card>
      <template #title>
        <div class="flex items-center">
          <UserAddOutlined class="mr-2 text-lg" />
          <span>Assignment Rules</span>
        </div>
      </template>

      <Alert
        class="mb-4"
        type="info"
        show-icon
        message="Assignment Rules automatically assign ownership of records based on criteria, supporting direct user assignment, load-based, lookup field, expression-based, and round-robin methods."
      />

      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Rules Tab -->
        <TabPane key="rules" tab="Assignment Rules">
          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4 justify-between">
            <Space>
              <Select
                v-model:value="filters.model_name"
                placeholder="Filter by Model"
                style="width: 150px"
                allowClear
                :options="availableModels"
                @change="() => { pagination.current = 1; fetchData(); }"
              />
              <Select
                v-model:value="filters.assignment_type"
                placeholder="Assignment Type"
                style="width: 180px"
                allowClear
                :options="assignmentTypeOptions"
                @change="() => { pagination.current = 1; fetchData(); }"
              />
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
            </Space>
            <Space>
              <Button @click="fetchData" :loading="loading">
                <template #icon><ReloadOutlined /></template>
                Refresh
              </Button>
              <Button type="primary" @click="openCreateForm">
                <template #icon><PlusOutlined /></template>
                New Rule
              </Button>
            </Space>
          </div>

          <Spin :spinning="loading">
            <Table
              :columns="columns"
              :dataSource="data"
              :pagination="pagination"
              :loading="loading"
              @change="handleTableChange"
              rowKey="id"
              size="middle"
              :scroll="{ x: 1000 }"
            >
              <template #bodyCell="{ column, record }">
                <!-- Name -->
                <template v-if="column.key === 'name'">
                  <div class="font-medium">{{ record.name }}</div>
                  <div class="text-xs text-gray-400">{{ record.code }}</div>
                </template>

                <!-- Assignment Type -->
                <template v-else-if="column.key === 'assignment_type'">
                  <Tag color="blue">
                    {{ getAssignmentTypeConfig(record.assignment_type).label }}
                  </Tag>
                </template>

                <!-- Trigger -->
                <template v-else-if="column.key === 'trigger_on'">
                  <Tag color="purple">
                    {{ getTriggerConfig(record.trigger_on).label }}
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
                  <div class="actions-cell flex items-center gap-1">
                    <Tooltip title="Edit">
                      <Button type="text" size="small" @click="openEditForm(record)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Delete this rule?"
                      ok-text="Delete"
                      ok-type="danger"
                      @confirm="deleteRule(record)"
                    >
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>

        <!-- Round-Robin Groups Tab -->
        <TabPane key="round-robin">
          <template #tab>
            <span><SyncOutlined class="mr-1" />Round-Robin Groups</span>
          </template>

          <div class="mb-4 flex justify-between">
            <Button @click="fetchRRGroups" :loading="rrGroupsLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="openCreateRRGroupModal">
              <template #icon><PlusOutlined /></template>
              New Group
            </Button>
          </div>

          <Alert
            class="mb-4"
            type="info"
            message="Round-robin groups distribute assignments evenly across a list of users. Each new assignment goes to the next user in the rotation."
          />

          <Spin :spinning="rrGroupsLoading">
            <Table
              :columns="rrGroupColumns"
              :dataSource="rrGroups"
              :pagination="false"
              rowKey="name"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'users'">
                  <Space wrap>
                    <Tag v-for="userId in (record.user_ids || []).slice(0, 5)" :key="userId">
                      User {{ userId }}
                    </Tag>
                    <span v-if="(record.user_ids || []).length > 5" class="text-gray-400">
                      +{{ record.user_ids.length - 5 }} more
                    </span>
                  </Space>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div class="actions-cell flex items-center gap-1">
                    <Tooltip title="Edit">
                      <Button type="text" size="small" @click="openEditRRGroupModal(record)">
                        <template #icon><EditOutlined /></template>
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Delete this group?"
                      ok-text="Delete"
                      ok-type="danger"
                      @confirm="deleteRRGroup(record)"
                    >
                      <Tooltip title="Delete">
                        <Button type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </div>
                </template>
              </template>
            </Table>

            <div v-if="rrGroups.length === 0" class="text-center py-8 text-gray-400">
              No round-robin groups configured yet.
            </div>
          </Spin>
        </TabPane>

        <!-- Logs Tab -->
        <TabPane key="logs">
          <template #tab>
            <span><HistoryOutlined class="mr-1" />Assignment Logs</span>
          </template>

          <div class="mb-4">
            <Button @click="fetchLogs" :loading="logsLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
          </div>

          <Spin :spinning="logsLoading">
            <Table
              :columns="logColumns"
              :dataSource="logs"
              :pagination="logsPagination"
              @change="(pag) => { logsPagination.current = pag.current; fetchLogs(); }"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'created_at'">
                  {{ record.created_at ? record.created_at.replace('T', ' ').slice(0, 19) : '-' }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="record.status === 'success' ? 'green' : 'red'">
                    {{ record.status }}
                  </Tag>
                </template>
              </template>
            </Table>
          </Spin>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Round-Robin Group Modal -->
    <Modal
      v-model:open="rrGroupModalVisible"
      :title="isEditingRRGroup ? 'Edit Round-Robin Group' : 'New Round-Robin Group'"
      @ok="saveRRGroup"
      width="500px"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Group Name" required>
          <Input
            v-model:value="rrGroupForm.name"
            placeholder="Enter group name"
            :disabled="isEditingRRGroup"
          />
        </FormItem>
        <FormItem label="Users">
          <Select
            v-model:value="rrGroupForm.user_ids"
            mode="multiple"
            placeholder="Select users"
            :options="availableUsers"
          />
          <div class="text-xs text-gray-400 mt-1">
            Users will be assigned in the order selected
          </div>
        </FormItem>
        <FormItem v-if="isEditingRRGroup" label="Current Index">
          <InputNumber
            v-model:value="rrGroupForm.current_index"
            :min="0"
            :max="rrGroupForm.user_ids.length - 1"
            style="width: 100%"
          />
          <div class="text-xs text-gray-400 mt-1">
            Index of the next user to be assigned
          </div>
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
