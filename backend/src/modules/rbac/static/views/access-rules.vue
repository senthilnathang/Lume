<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Modal,
  Form,
  FormItem,
  Select,
  SelectOption,
  Switch,
  JsonEditor,
  message,
  Spin,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  FileProtectOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'RbacAccessRules',
});

const loading = ref(false);
const searchText = ref('');
const rules = ref([]);
const roles = ref([]);
const models = ['Donation', 'User', 'Activity', 'Document', 'Campaign', 'Team'];
const permissions = ['read', 'write', 'delete'];
const modalVisible = ref(false);
const editingRule = ref(null);

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Model',
    dataIndex: 'model',
    key: 'model',
  },
  {
    title: 'Role',
    dataIndex: 'roleId',
    key: 'roleId',
    width: 120,
  },
  {
    title: 'Permission',
    dataIndex: 'permission',
    key: 'permission',
    width: 100,
  },
  {
    title: 'Filter',
    dataIndex: 'filter',
    key: 'filter',
  },
  {
    title: 'Priority',
    dataIndex: 'priority',
    key: 'priority',
    width: 80,
  },
  {
    title: 'Active',
    dataIndex: 'isActive',
    key: 'isActive',
    width: 80,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
  },
];

const formState = ref({
  name: '',
  model: '',
  roleId: null,
  permission: '',
  filter: {},
  priority: 0,
  isActive: true,
});

const filteredRules = computed(() => {
  return rules.value.filter((rule) => {
    return (
      !searchText.value ||
      rule.name.toLowerCase().includes(searchText.value.toLowerCase()) ||
      rule.model.toLowerCase().includes(searchText.value.toLowerCase())
    );
  });
});

function getRoleName(roleId) {
  const role = roles.value.find(r => r.id === roleId);
  return role ? role.name : `Role ${roleId}`;
}

function getPermissionColor(permission) {
  const colors = {
    read: 'blue',
    write: 'green',
    delete: 'red'
  };
  return colors[permission] || 'default';
}

function formatFilter(filter) {
  if (!filter) return '-';
  try {
    return JSON.stringify(filter);
  } catch {
    return String(filter);
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [rulesRes, rolesRes] = await Promise.all([
      fetch('/api/rbac/rules'),
      fetch('/api/rbac/roles')
    ]);
    rules.value = (await rulesRes.json()).data;
    roles.value = (await rolesRes.json()).data;
  } catch (error) {
    message.error('Failed to load data');
  } finally {
    loading.value = false;
  }
}

function openModal(rule = null) {
  editingRule.value = rule;
  if (rule) {
    formState.value = {
      name: rule.name,
      model: rule.model,
      roleId: rule.roleId,
      permission: rule.permission,
      filter: rule.filter || {},
      priority: rule.priority,
      isActive: rule.isActive,
    };
  } else {
    formState.value = {
      name: '',
      model: '',
      roleId: null,
      permission: '',
      filter: {},
      priority: 0,
      isActive: true,
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingRule.value = null;
}

async function handleSave() {
  loading.value = true;
  try {
    if (editingRule.value) {
      await fetch(`/api/rbac/rules/${editingRule.value.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState.value)
      });
      message.success('Rule updated successfully');
    } else {
      await fetch('/api/rbac/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formState.value)
      });
      message.success('Rule created successfully');
    }
    closeModal();
    await loadData();
  } catch (error) {
    message.error('Failed to save rule');
  } finally {
    loading.value = false;
  }
}

async function handleDelete(rule) {
  try {
    await fetch(`/api/rbac/rules/${rule.id}`, { method: 'DELETE' });
    message.success('Rule deleted successfully');
    await loadData();
  } catch (error) {
    message.error('Failed to delete rule');
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page title="Access Rules" description="Configure record-level access control">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Input
            v-model:value="searchText"
            placeholder="Search rules..."
            style="width: 250px"
            allow-clear
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add Rule
          </Button>
        </div>

        <Table
          :data-source="filteredRules"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'roleId'">
              <Tag color="purple">{{ getRoleName(record.roleId) }}</Tag>
            </template>

            <template v-else-if="column.key === 'permission'">
              <Tag :color="getPermissionColor(record.permission)">{{ record.permission }}</Tag>
            </template>

            <template v-else-if="column.key === 'filter'">
              <code class="text-xs">{{ formatFilter(record.filter) }}</code>
            </template>

            <template v-else-if="column.key === 'isActive'">
              <Tag :color="record.isActive ? 'success' : 'default'">
                {{ record.isActive ? 'Active' : 'Inactive' }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <a-tooltip title="Edit">
                  <a-button type="text" size="small" @click="openModal(record)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                </a-tooltip>
                <a-popconfirm title="Delete this item?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record)">
                  <a-tooltip title="Delete">
                    <a-button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingRule ? 'Edit Rule' : 'Create Rule'"
        @ok="handleSave"
        :confirm-loading="loading"
        width="600px"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input v-model:value="formState.name" placeholder="Rule name" />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Model" required>
                <Select v-model:value="formState.model" placeholder="Select model">
                  <SelectOption v-for="model in models" :key="model" :value="model">
                    {{ model }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Role" required>
                <Select v-model:value="formState.roleId" placeholder="Select role">
                  <SelectOption v-for="role in roles" :key="role.id" :value="role.id">
                    {{ role.name }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Permission" required>
                <Select v-model:value="formState.permission" placeholder="Select permission">
                  <SelectOption v-for="perm in permissions" :key="perm" :value="perm">
                    {{ perm }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Priority">
                <Input v-model:value="formState.priority" type="number" />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Filter (JSON)">
            <Input
              v-model:value="filterJson"
              type="textarea"
              :rows="3"
              placeholder='{"status": "active"}'
            />
          </FormItem>
          <FormItem label="Active">
            <Switch v-model:checked="formState.isActive" />
          </FormItem>
        </Form>
      </Modal>
    </Spin>
  </Page>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  setup() {
    const filterJson = computed({
      get: () => JSON.stringify(formState.value.filter, null, 2),
      set: (val) => {
        try {
          formState.value.filter = JSON.parse(val);
        } catch {
          formState.value.filter = {};
        }
      }
    });
    return { filterJson };
  }
};
</script>

<script setup>
import { Row, Col } from 'ant-design-vue';
</script>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.text-xs {
  font-size: 12px;
}

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}
:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
