<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  // Switch,
  Table,
  Tabs,
  TabPane,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  // SearchOutlined,
} from '@ant-design/icons-vue';

import {
  createRLSPolicyApi,
  deleteRLSPolicyApi,
  getRLSAuditLogsApi,
  getRLSAuditStatsApi,
  getRLSPoliciesApi,
  updateRLSPolicyApi,
  type SecurityApi,
} from '#/api/security';

defineOptions({
  name: 'RLSSettings',
});

// State
const loading = ref(false);
const policies = ref<SecurityApi.RLSPolicy[]>([]);
const auditLogs = ref<SecurityApi.RLSAuditLog[]>([]);
const auditStats = ref<SecurityApi.RLSAuditStats | null>(null);

// Modal state
const showPolicyModal = ref(false);
const showViewModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const selectedPolicy = ref<SecurityApi.RLSPolicy | null>(null);
const savingPolicy = ref(false);

// Form state
const policyForm = ref<SecurityApi.RLSPolicyCreate>({
  name: '',
  entity_type: 'USER',
  table_name: '',
  policy_type: 'PERMISSIVE',
  action: 'SELECT',
});

// Filter state
const entityTypeFilter = ref<SecurityApi.RLSEntityType | undefined>(undefined);
const actionFilter = ref<SecurityApi.RLSAction | undefined>(undefined);

const entityTypes: SecurityApi.RLSEntityType[] = [
  'USER',
  'COMPANY',
  'ROLE',
  'GROUP',
  'PERMISSION',
  'DOCUMENT',
  'RECORD',
];

const actions: SecurityApi.RLSAction[] = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'ALL',
];

const policyTypes: SecurityApi.RLSPolicyType[] = ['PERMISSIVE', 'RESTRICTIVE'];

const policyColumns = computed(() => [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Entity Type',
    dataIndex: 'entity_type',
    key: 'entity_type',
    width: 120,
  },
  {
    title: 'Table',
    dataIndex: 'table_name',
    key: 'table_name',
    width: 150,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 100,
  },
  {
    title: 'Type',
    dataIndex: 'policy_type',
    key: 'policy_type',
    width: 120,
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
    fixed: 'right' as const,
  },
]);

const auditColumns = computed(() => [
  {
    title: 'Time',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
  },
  {
    title: 'User ID',
    dataIndex: 'user_id',
    key: 'user_id',
    width: 80,
  },
  {
    title: 'Entity Type',
    dataIndex: 'entity_type',
    key: 'entity_type',
    width: 120,
  },
  {
    title: 'Action',
    dataIndex: 'action',
    key: 'action',
    width: 100,
  },
  {
    title: 'Access',
    key: 'access_granted',
    width: 100,
  },
  {
    title: 'Denial Reason',
    dataIndex: 'denial_reason',
    key: 'denial_reason',
    ellipsis: true,
  },
]);

async function fetchPolicies() {
  loading.value = true;
  try {
    const response = await getRLSPoliciesApi({
      entity_type: entityTypeFilter.value,
      action: actionFilter.value,
    });
    policies.value = response;
  } catch (error) {
    console.error('Failed to fetch RLS policies:', error);
    message.error('Failed to load RLS policies');
  } finally {
    loading.value = false;
  }
}

async function fetchAuditData() {
  try {
    const [logsResponse, statsResponse] = await Promise.all([
      getRLSAuditLogsApi({ limit: 100 }),
      getRLSAuditStatsApi(7),
    ]);
    auditLogs.value = logsResponse;
    auditStats.value = statsResponse;
  } catch (error) {
    console.error('Failed to fetch audit data:', error);
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  policyForm.value = {
    name: '',
    entity_type: 'USER',
    table_name: '',
    policy_type: 'PERMISSIVE',
    action: 'SELECT',
  };
  showPolicyModal.value = true;
}

function openEditModal(policy: SecurityApi.RLSPolicy) {
  modalMode.value = 'edit';
  selectedPolicy.value = policy;
  policyForm.value = {
    name: policy.name,
    description: policy.description || undefined,
    entity_type: policy.entity_type,
    table_name: policy.table_name,
    policy_type: policy.policy_type,
    action: policy.action,
    condition_column: policy.condition_column || undefined,
    condition_value_source: policy.condition_value_source || undefined,
    custom_condition: policy.custom_condition || undefined,
    required_roles: policy.required_roles,
    required_permissions: policy.required_permissions,
    priority: policy.priority,
  };
  showPolicyModal.value = true;
}

function openViewModal(policy: SecurityApi.RLSPolicy) {
  selectedPolicy.value = policy;
  showViewModal.value = true;
}

async function savePolicy() {
  if (!policyForm.value.name || !policyForm.value.table_name) {
    message.warning('Please fill in required fields');
    return;
  }

  savingPolicy.value = true;
  try {
    if (modalMode.value === 'create') {
      await createRLSPolicyApi(policyForm.value);
      message.success('RLS policy created successfully');
    } else if (selectedPolicy.value) {
      await updateRLSPolicyApi(selectedPolicy.value.id, policyForm.value);
      message.success('RLS policy updated successfully');
    }
    showPolicyModal.value = false;
    fetchPolicies();
  } catch (error: any) {
    console.error('Failed to save policy:', error);
    message.error(error?.response?.data?.detail || 'Failed to save RLS policy');
  } finally {
    savingPolicy.value = false;
  }
}

async function deletePolicy(policy: SecurityApi.RLSPolicy) {
  try {
    await deleteRLSPolicyApi(policy.id);
    message.success('RLS policy deleted successfully');
    fetchPolicies();
  } catch (error: any) {
    console.error('Failed to delete policy:', error);
    message.error(error?.response?.data?.detail || 'Failed to delete RLS policy');
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}

function getActionColor(action: string) {
  const colors: Record<string, string> = {
    SELECT: 'blue',
    INSERT: 'green',
    UPDATE: 'orange',
    DELETE: 'red',
    ALL: 'purple',
  };
  return colors[action] || 'default';
}

function getPolicyTypeColor(type: string) {
  return type === 'PERMISSIVE' ? 'green' : 'red';
}

onMounted(() => {
  fetchPolicies();
  fetchAuditData();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <Space>
          <LockOutlined />
          <span>Row Level Security (RLS)</span>
        </Space>
      </template>

      <Tabs>
        <!-- Policies Tab -->
        <TabPane key="policies" tab="Policies">
          <div class="mb-4 flex items-center justify-between">
            <Space>
              <Select
                v-model:value="entityTypeFilter"
                placeholder="Filter by Entity Type"
                style="width: 180px"
                allow-clear
                @change="fetchPolicies"
              >
                <SelectOption v-for="et in entityTypes" :key="et" :value="et">
                  {{ et }}
                </SelectOption>
              </Select>
              <Select
                v-model:value="actionFilter"
                placeholder="Filter by Action"
                style="width: 150px"
                allow-clear
                @change="fetchPolicies"
              >
                <SelectOption v-for="action in actions" :key="action" :value="action">
                  {{ action }}
                </SelectOption>
              </Select>
              <Button @click="fetchPolicies">
                <template #icon><ReloadOutlined /></template>
              </Button>
            </Space>
            <Button type="primary" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              Create Policy
            </Button>
          </div>

          <Table
            :columns="policyColumns"
            :data-source="policies"
            :loading="loading"
            :scroll="{ x: 1000 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'entity_type'">
                <Tag color="blue">{{ record.entity_type }}</Tag>
              </template>

              <template v-if="column.key === 'action'">
                <Tag :color="getActionColor(record.action)">
                  {{ record.action }}
                </Tag>
              </template>

              <template v-if="column.key === 'policy_type'">
                <Tag :color="getPolicyTypeColor(record.policy_type)">
                  {{ record.policy_type }}
                </Tag>
              </template>

              <template v-if="column.key === 'status'">
                <Tag :color="record.is_active ? 'green' : 'red'">
                  {{ record.is_active ? 'Active' : 'Inactive' }}
                </Tag>
              </template>

              <template v-if="column.key === 'actions'">
                <Space>
                  <Tooltip title="View">
                    <Button type="link" size="small" @click="openViewModal(record as any)">
                      <template #icon><EyeOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <Button type="link" size="small" @click="openEditModal(record as any)">
                      <template #icon><EditOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this policy?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="deletePolicy(record as any)"
                  >
                    <Tooltip title="Delete">
                      <Button type="link" size="small" danger>
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </Space>
              </template>
            </template>

            <template #emptyText>
              <div class="py-8 text-center">
                <SafetyCertificateOutlined class="mb-2 text-4xl text-gray-400" />
                <p class="text-gray-500">No RLS policies found</p>
              </div>
            </template>
          </Table>
        </TabPane>

        <!-- Audit Logs Tab -->
        <TabPane key="audit" tab="Audit Logs">
          <!-- Stats -->
          <Row v-if="auditStats" :gutter="[16, 16]" class="mb-6">
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Total Attempts"
                  :value="auditStats.total_attempts"
                  :value-style="{ color: '#1890ff' }"
                />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Granted"
                  :value="auditStats.granted_count"
                  :value-style="{ color: '#52c41a' }"
                >
                  <template #prefix>
                    <CheckCircleOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Denied"
                  :value="auditStats.denied_count"
                  :value-style="{ color: '#ff4d4f' }"
                >
                  <template #prefix>
                    <CloseCircleOutlined />
                  </template>
                </Statistic>
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Success Rate"
                  :value="auditStats.success_rate"
                  :precision="1"
                  suffix="%"
                  :value-style="{ color: auditStats.success_rate >= 90 ? '#52c41a' : '#faad14' }"
                />
              </Card>
            </Col>
          </Row>

          <Table
            :columns="auditColumns"
            :data-source="auditLogs"
            :scroll="{ x: 800 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'created_at'">
                {{ formatDate(record.created_at) }}
              </template>

              <template v-if="column.key === 'entity_type'">
                <Tag color="blue">{{ record.entity_type }}</Tag>
              </template>

              <template v-if="column.key === 'action'">
                <Tag :color="getActionColor(record.action)">
                  {{ record.action }}
                </Tag>
              </template>

              <template v-if="column.key === 'access_granted'">
                <Tag :color="record.access_granted ? 'green' : 'red'">
                  {{ record.access_granted ? 'Granted' : 'Denied' }}
                </Tag>
              </template>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Create/Edit Policy Modal -->
    <Modal
      v-model:open="showPolicyModal"
      :title="modalMode === 'create' ? 'Create RLS Policy' : 'Edit RLS Policy'"
      :width="600"
      :footer="null"
    >
      <Form layout="vertical">
        <Row :gutter="16">
          <Col :span="24">
            <FormItem label="Policy Name" required>
              <Input v-model:value="policyForm.name" placeholder="Enter policy name" />
            </FormItem>
          </Col>
          <Col :span="24">
            <FormItem label="Description">
              <Textarea
                v-model:value="policyForm.description"
                placeholder="Enter description"
                :rows="2"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Entity Type" required>
              <Select v-model:value="policyForm.entity_type" style="width: 100%">
                <SelectOption v-for="et in entityTypes" :key="et" :value="et">
                  {{ et }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Table Name" required>
              <Input v-model:value="policyForm.table_name" placeholder="e.g., users" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Policy Type" required>
              <Select v-model:value="policyForm.policy_type" style="width: 100%">
                <SelectOption v-for="pt in policyTypes" :key="pt" :value="pt">
                  {{ pt }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Action" required>
              <Select v-model:value="policyForm.action" style="width: 100%">
                <SelectOption v-for="action in actions" :key="action" :value="action">
                  {{ action }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Condition Column">
              <Input v-model:value="policyForm.condition_column" placeholder="e.g., company_id" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Condition Value Source">
              <Input v-model:value="policyForm.condition_value_source" placeholder="e.g., user.company_id" />
            </FormItem>
          </Col>
          <Col :span="24">
            <FormItem label="Custom Condition (SQL)">
              <Textarea
                v-model:value="policyForm.custom_condition"
                placeholder="e.g., company_id = current_user_company_id()"
                :rows="2"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Priority">
              <InputNumber v-model:value="policyForm.priority" :min="0" :max="1000" style="width: 100%" />
            </FormItem>
          </Col>
        </Row>

        <div class="flex justify-end gap-2">
          <Button @click="showPolicyModal = false">Cancel</Button>
          <Button type="primary" :loading="savingPolicy" @click="savePolicy">
            {{ modalMode === 'create' ? 'Create' : 'Update' }}
          </Button>
        </div>
      </Form>
    </Modal>

    <!-- View Policy Drawer -->
    <Drawer
      v-model:open="showViewModal"
      title="RLS Policy Details"
      :width="500"
    >
      <template v-if="selectedPolicy">
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem label="Name">{{ selectedPolicy.name }}</DescriptionsItem>
          <DescriptionsItem label="Description">{{ selectedPolicy.description || '-' }}</DescriptionsItem>
          <DescriptionsItem label="Entity Type">
            <Tag color="blue">{{ selectedPolicy.entity_type }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Table Name">{{ selectedPolicy.table_name }}</DescriptionsItem>
          <DescriptionsItem label="Policy Type">
            <Tag :color="getPolicyTypeColor(selectedPolicy.policy_type)">
              {{ selectedPolicy.policy_type }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Action">
            <Tag :color="getActionColor(selectedPolicy.action)">
              {{ selectedPolicy.action }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Condition Column">
            {{ selectedPolicy.condition_column || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="Condition Value Source">
            {{ selectedPolicy.condition_value_source || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="Custom Condition">
            <code v-if="selectedPolicy.custom_condition">
              {{ selectedPolicy.custom_condition }}
            </code>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Priority">{{ selectedPolicy.priority }}</DescriptionsItem>
          <DescriptionsItem label="Status">
            <Tag :color="selectedPolicy.is_active ? 'green' : 'red'">
              {{ selectedPolicy.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Required Roles">
            <Space v-if="selectedPolicy.required_roles?.length">
              <Tag v-for="role in selectedPolicy.required_roles" :key="role">
                {{ role }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Required Permissions">
            <Space v-if="selectedPolicy.required_permissions?.length">
              <Tag v-for="perm in selectedPolicy.required_permissions" :key="perm">
                {{ perm }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Created At">
            {{ formatDate(selectedPolicy.created_at) }}
          </DescriptionsItem>
        </Descriptions>
      </template>
    </Drawer>
  </Page>
</template>
