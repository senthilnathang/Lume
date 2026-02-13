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
  Switch,
  Table,
  Tabs,
  TabPane,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  createACLApi,
  deleteACLApi,
  getACLsApi,
  getRecordPermissionsApi,
  revokeRecordPermissionApi,
  updateACLApi,
  type SecurityApi,
} from '#/api/security';

defineOptions({
  name: 'ACLSettings',
});

// State
const loading = ref(false);
const acls = ref<SecurityApi.ACL[]>([]);
const recordPermissions = ref<SecurityApi.RecordPermission[]>([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

// Modal state
const showACLModal = ref(false);
const showViewModal = ref(false);
const modalMode = ref<'create' | 'edit'>('create');
const selectedACL = ref<SecurityApi.ACL | null>(null);
const savingACL = ref(false);

// Form state
const aclForm = ref<SecurityApi.ACLCreate>({
  name: '',
  entity_type: '',
  operation: 'read',
  priority: 100,
  is_active: true,
});

// Filter state
const entityTypeFilter = ref<string | undefined>(undefined);
const operationFilter = ref<string | undefined>(undefined);

const operations = ['create', 'read', 'update', 'delete', 'manage', 'export', 'import'];

const aclColumns = computed(() => [
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
    width: 150,
  },
  {
    title: 'Operation',
    dataIndex: 'operation',
    key: 'operation',
    width: 120,
  },
  {
    title: 'Field',
    dataIndex: 'field_name',
    key: 'field_name',
    width: 120,
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
  },
  {
    title: 'Approval',
    key: 'requires_approval',
    width: 100,
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

const permissionColumns = computed(() => [
  {
    title: 'Entity Type',
    dataIndex: 'entity_type',
    key: 'entity_type',
    width: 150,
  },
  {
    title: 'Entity ID',
    dataIndex: 'entity_id',
    key: 'entity_id',
    width: 120,
  },
  {
    title: 'Operation',
    dataIndex: 'operation',
    key: 'operation',
    width: 120,
  },
  {
    title: 'User/Role',
    key: 'user_role',
    width: 120,
  },
  {
    title: 'Granted At',
    dataIndex: 'granted_at',
    key: 'granted_at',
    width: 180,
  },
  {
    title: 'Expires At',
    dataIndex: 'expires_at',
    key: 'expires_at',
    width: 180,
  },
  {
    title: 'Status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
    fixed: 'right' as const,
  },
]);

const statistics = computed(() => {
  const total = acls.value.length;
  const active = acls.value.filter((a) => a.is_active).length;
  const requiresApproval = acls.value.filter((a) => a.requires_approval).length;
  const entityTypes = new Set(acls.value.map((a) => a.entity_type));

  return {
    total,
    active,
    requiresApproval,
    entityTypeCount: entityTypes.size,
  };
});

async function fetchACLs() {
  loading.value = true;
  try {
    const response = await getACLsApi({
      entity_type: entityTypeFilter.value,
      operation: operationFilter.value,
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    });
    acls.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch ACLs:', error);
    message.error('Failed to load ACLs');
  } finally {
    loading.value = false;
  }
}

async function fetchRecordPermissions() {
  try {
    const response = await getRecordPermissionsApi({ limit: 100 });
    recordPermissions.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch record permissions:', error);
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  aclForm.value = {
    name: '',
    entity_type: '',
    operation: 'read',
    priority: 100,
    is_active: true,
  };
  showACLModal.value = true;
}

function openEditModal(acl: SecurityApi.ACL) {
  modalMode.value = 'edit';
  selectedACL.value = acl;
  aclForm.value = {
    name: acl.name,
    description: acl.description || undefined,
    entity_type: acl.entity_type,
    operation: acl.operation,
    field_name: acl.field_name || undefined,
    condition_script: acl.condition_script || undefined,
    condition_context: acl.condition_context,
    allowed_roles: acl.allowed_roles,
    denied_roles: acl.denied_roles,
    allowed_users: acl.allowed_users,
    denied_users: acl.denied_users,
    requires_approval: acl.requires_approval,
    approval_workflow_id: acl.approval_workflow_id || undefined,
    priority: acl.priority,
    is_active: acl.is_active,
  };
  showACLModal.value = true;
}

function openViewModal(acl: SecurityApi.ACL) {
  selectedACL.value = acl;
  showViewModal.value = true;
}

async function saveACL() {
  if (!aclForm.value.name || !aclForm.value.entity_type || !aclForm.value.operation) {
    message.warning('Please fill in required fields');
    return;
  }

  savingACL.value = true;
  try {
    if (modalMode.value === 'create') {
      await createACLApi(aclForm.value);
      message.success('ACL created successfully');
    } else if (selectedACL.value) {
      await updateACLApi(selectedACL.value.id, aclForm.value);
      message.success('ACL updated successfully');
    }
    showACLModal.value = false;
    fetchACLs();
  } catch (error: any) {
    console.error('Failed to save ACL:', error);
    message.error(error?.response?.data?.detail || 'Failed to save ACL');
  } finally {
    savingACL.value = false;
  }
}

async function deleteACL(acl: SecurityApi.ACL) {
  try {
    await deleteACLApi(acl.id);
    message.success('ACL deleted successfully');
    fetchACLs();
  } catch (error: any) {
    console.error('Failed to delete ACL:', error);
    message.error(error?.response?.data?.detail || 'Failed to delete ACL');
  }
}

async function revokePermission(permission: SecurityApi.RecordPermission) {
  try {
    await revokeRecordPermissionApi(permission.id);
    message.success('Permission revoked successfully');
    fetchRecordPermissions();
  } catch (error: any) {
    console.error('Failed to revoke permission:', error);
    message.error(error?.response?.data?.detail || 'Failed to revoke permission');
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchACLs();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function getOperationColor(operation: string) {
  const colors: Record<string, string> = {
    create: 'green',
    read: 'blue',
    update: 'orange',
    delete: 'red',
    manage: 'purple',
    export: 'cyan',
    import: 'geekblue',
  };
  return colors[operation] || 'default';
}

onMounted(() => {
  fetchACLs();
  fetchRecordPermissions();
});
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <Space>
          <SafetyCertificateOutlined />
          <span>Access Control Lists (ACL)</span>
        </Space>
      </template>

      <Tabs>
        <!-- ACLs Tab -->
        <TabPane key="acls" tab="Access Control Lists">
          <!-- Statistics -->
          <Row :gutter="[16, 16]" class="mb-6">
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Total ACLs"
                  :value="statistics.total"
                  :value-style="{ color: '#1890ff' }"
                />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Active"
                  :value="statistics.active"
                  :value-style="{ color: '#52c41a' }"
                />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Requires Approval"
                  :value="statistics.requiresApproval"
                  :value-style="{ color: '#faad14' }"
                />
              </Card>
            </Col>
            <Col :xs="12" :sm="6">
              <Card size="small">
                <Statistic
                  title="Entity Types"
                  :value="statistics.entityTypeCount"
                  :value-style="{ color: '#722ed1' }"
                />
              </Card>
            </Col>
          </Row>

          <div class="mb-4 flex items-center justify-between">
            <Space>
              <Input
                v-model:value="entityTypeFilter"
                placeholder="Filter by Entity Type"
                style="width: 180px"
                allow-clear
                @change="fetchACLs"
              />
              <Select
                v-model:value="operationFilter"
                placeholder="Filter by Operation"
                style="width: 150px"
                allow-clear
                @change="fetchACLs"
              >
                <SelectOption v-for="op in operations" :key="op" :value="op">
                  {{ op.toUpperCase() }}
                </SelectOption>
              </Select>
              <Button @click="fetchACLs">
                <template #icon><ReloadOutlined /></template>
              </Button>
            </Space>
            <Button type="primary" @click="openCreateModal">
              <template #icon><PlusOutlined /></template>
              Create ACL
            </Button>
          </div>

          <Table
            :columns="aclColumns"
            :data-source="acls"
            :loading="loading"
            :pagination="pagination"
            :scroll="{ x: 1000 }"
            row-key="id"
            @change="handleTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'entity_type'">
                <Tag color="blue">{{ record.entity_type }}</Tag>
              </template>

              <template v-if="column.key === 'operation'">
                <Tag :color="getOperationColor(record.operation)">
                  {{ record.operation.toUpperCase() }}
                </Tag>
              </template>

              <template v-if="column.key === 'requires_approval'">
                <Tag :color="record.requires_approval ? 'orange' : 'default'">
                  {{ record.requires_approval ? 'Yes' : 'No' }}
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
                    <Button type="link" size="small" @click="openViewModal(record as any as SecurityApi.ACL)">
                      <template #icon><EyeOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <Button type="link" size="small" @click="openEditModal(record as any as SecurityApi.ACL)">
                      <template #icon><EditOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this ACL?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="deleteACL(record as any as SecurityApi.ACL)"
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
                <LockOutlined class="mb-2 text-4xl text-gray-400" />
                <p class="text-gray-500">No ACLs found</p>
              </div>
            </template>
          </Table>
        </TabPane>

        <!-- Record Permissions Tab -->
        <TabPane key="permissions" tab="Record Permissions">
          <div class="mb-4 flex justify-end">
            <Button @click="fetchRecordPermissions">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
          </div>

          <Table
            :columns="permissionColumns"
            :data-source="recordPermissions"
            :scroll="{ x: 1000 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'entity_type'">
                <Tag color="blue">{{ record.entity_type }}</Tag>
              </template>

              <template v-if="column.key === 'operation'">
                <Tag :color="getOperationColor(record.operation)">
                  {{ record.operation.toUpperCase() }}
                </Tag>
              </template>

              <template v-if="column.key === 'user_role'">
                <Space>
                  <UserOutlined v-if="record.user_id" />
                  <span v-if="record.user_id">User {{ record.user_id }}</span>
                  <span v-else-if="record.role_id">Role {{ record.role_id }}</span>
                  <span v-else>-</span>
                </Space>
              </template>

              <template v-if="column.key === 'granted_at'">
                {{ formatDate(record.granted_at) }}
              </template>

              <template v-if="column.key === 'expires_at'">
                {{ formatDate(record.expires_at) }}
              </template>

              <template v-if="column.key === 'status'">
                <Tag :color="record.is_active ? 'green' : 'red'">
                  {{ record.is_active ? 'Active' : 'Revoked' }}
                </Tag>
              </template>

              <template v-if="column.key === 'actions'">
                <Popconfirm
                  v-if="record.is_active"
                  title="Revoke this permission?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="revokePermission(record as any as SecurityApi.RecordPermission)"
                >
                  <Tooltip title="Revoke">
                    <Button type="link" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </template>
            </template>

            <template #emptyText>
              <div class="py-8 text-center">
                <SafetyCertificateOutlined class="mb-2 text-4xl text-gray-400" />
                <p class="text-gray-500">No record permissions found</p>
              </div>
            </template>
          </Table>
        </TabPane>
      </Tabs>
    </Card>

    <!-- Create/Edit ACL Modal -->
    <Modal
      v-model:open="showACLModal"
      :title="modalMode === 'create' ? 'Create ACL' : 'Edit ACL'"
      :width="700"
      :footer="null"
    >
      <Form layout="vertical">
        <Row :gutter="16">
          <Col :span="24">
            <FormItem label="ACL Name" required>
              <Input v-model:value="aclForm.name" placeholder="Enter ACL name" />
            </FormItem>
          </Col>
          <Col :span="24">
            <FormItem label="Description">
              <Textarea
                v-model:value="aclForm.description"
                placeholder="Enter description"
                :rows="2"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Entity Type" required>
              <Input v-model:value="aclForm.entity_type" placeholder="e.g., users, documents" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Operation" required>
              <Select v-model:value="aclForm.operation" style="width: 100%">
                <SelectOption v-for="op in operations" :key="op" :value="op">
                  {{ op.toUpperCase() }}
                </SelectOption>
              </Select>
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Field Name (for field-level ACL)">
              <Input v-model:value="aclForm.field_name" placeholder="e.g., salary, ssn" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Priority">
              <InputNumber v-model:value="aclForm.priority" :min="0" :max="1000" style="width: 100%" />
            </FormItem>
          </Col>
          <Col :span="24">
            <FormItem label="Condition Script (Python/JavaScript)">
              <Textarea
                v-model:value="aclForm.condition_script"
                placeholder="e.g., record.owner_id == user.id"
                :rows="3"
              />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Requires Approval">
              <Switch v-model:checked="aclForm.requires_approval" />
            </FormItem>
          </Col>
          <Col :span="12">
            <FormItem label="Active">
              <Switch v-model:checked="aclForm.is_active" />
            </FormItem>
          </Col>
        </Row>

        <div class="flex justify-end gap-2">
          <Button @click="showACLModal = false">Cancel</Button>
          <Button type="primary" :loading="savingACL" @click="saveACL">
            {{ modalMode === 'create' ? 'Create' : 'Update' }}
          </Button>
        </div>
      </Form>
    </Modal>

    <!-- View ACL Drawer -->
    <Drawer
      v-model:open="showViewModal"
      title="ACL Details"
      :width="500"
    >
      <template v-if="selectedACL">
        <Descriptions :column="1" bordered size="small">
          <DescriptionsItem label="Name">{{ selectedACL.name }}</DescriptionsItem>
          <DescriptionsItem label="Description">{{ selectedACL.description || '-' }}</DescriptionsItem>
          <DescriptionsItem label="Entity Type">
            <Tag color="blue">{{ selectedACL.entity_type }}</Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Operation">
            <Tag :color="getOperationColor(selectedACL.operation)">
              {{ selectedACL.operation.toUpperCase() }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Field Name">
            {{ selectedACL.field_name || '-' }}
          </DescriptionsItem>
          <DescriptionsItem label="Priority">{{ selectedACL.priority }}</DescriptionsItem>
          <DescriptionsItem label="Condition Script">
            <code v-if="selectedACL.condition_script">
              {{ selectedACL.condition_script }}
            </code>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Requires Approval">
            <Tag :color="selectedACL.requires_approval ? 'orange' : 'default'">
              {{ selectedACL.requires_approval ? 'Yes' : 'No' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Status">
            <Tag :color="selectedACL.is_active ? 'green' : 'red'">
              {{ selectedACL.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </DescriptionsItem>
          <DescriptionsItem label="Allowed Roles">
            <Space v-if="selectedACL.allowed_roles?.length">
              <Tag v-for="role in selectedACL.allowed_roles" :key="role" color="green">
                {{ role }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Denied Roles">
            <Space v-if="selectedACL.denied_roles?.length">
              <Tag v-for="role in selectedACL.denied_roles" :key="role" color="red">
                {{ role }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Allowed Users">
            <Space v-if="selectedACL.allowed_users?.length">
              <Tag v-for="userId in selectedACL.allowed_users" :key="userId" color="green">
                User {{ userId }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Denied Users">
            <Space v-if="selectedACL.denied_users?.length">
              <Tag v-for="userId in selectedACL.denied_users" :key="userId" color="red">
                User {{ userId }}
              </Tag>
            </Space>
            <span v-else>-</span>
          </DescriptionsItem>
          <DescriptionsItem label="Created At">
            {{ formatDate(selectedACL.created_at) }}
          </DescriptionsItem>
        </Descriptions>
      </template>
    </Drawer>
  </Page>
</template>
