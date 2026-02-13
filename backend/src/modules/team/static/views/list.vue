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
  Select,
  SelectOption,
  Avatar,
  Dropdown,
  Menu,
  MenuItem,
  Modal,
  Form,
  FormItem,
  Input as AntInput,
  Switch,
  message,
  Spin,
  Row,
  Col,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'TeamList',
});

const loading = ref(false);
const saving = ref(false);
const searchText = ref('');
const departmentFilter = ref(null);
const teamMembers = ref([]);
const modalVisible = ref(false);
const editingMember = ref(null);

const columns = [
  { title: 'Member', key: 'name', width: 280 },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Department', dataIndex: 'department', key: 'department' },
  { title: 'Position', dataIndex: 'position', key: 'position' },
  { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100 },
  { title: 'Actions', key: 'actions', width: 80 },
];

const departments = ['Leadership', 'Programs', 'Operations', 'Fundraising', 'Finance', 'HR'];

const formState = ref({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  is_active: true,
});

const filteredMembers = computed(() => {
  return teamMembers.value.filter((member) => {
    const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
    const matchesSearch =
      !searchText.value ||
      fullName.includes(searchText.value.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchText.value.toLowerCase()));
    const matchesDepartment = !departmentFilter.value || member.department === departmentFilter.value;
    return matchesSearch && matchesDepartment;
  });
});

function getInitials(firstName, lastName) {
  const first = firstName ? firstName[0] : '';
  const last = lastName ? lastName[0] : '';
  return (first + last).toUpperCase();
}

function getStatusColor(isActive) {
  return isActive ? 'green' : 'default';
}

async function loadTeam() {
  loading.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/team', { headers });
    const result = await response.json();
    
    if (result.data) {
      teamMembers.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load team:', error);
    message.error('Failed to load team');
  } finally {
    loading.value = false;
  }
}

function openModal(member = null) {
  editingMember.value = member;
  if (member) {
    formState.value = {
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email || '',
      phone: member.phone || '',
      department: member.department || '',
      position: member.position || '',
      is_active: member.is_active !== false,
    };
  } else {
    formState.value = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      is_active: true,
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingMember.value = null;
}

async function handleSave() {
  saving.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = '/api/team';
    let method = 'POST';

    if (editingMember.value && editingMember.value.id) {
      url = `/api/team/${editingMember.value.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formState.value),
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success(editingMember.value ? 'Member updated successfully' : 'Member created successfully');
      closeModal();
      await loadTeam();
    } else {
      message.error(result.error || 'Failed to save member');
    }
  } catch (error) {
    console.error('Failed to save member:', error);
    message.error('Failed to save member');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(member) {
  Modal.confirm({
    title: 'Delete Member',
    content: `Are you sure you want to remove ${member.first_name} ${member.last_name} from the team?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/team/${member.id}`, {
          method: 'DELETE',
          headers,
        });

        const result = await response.json();

        if (result.success || response.ok) {
          message.success('Member removed successfully');
          await loadTeam();
        } else {
          message.error(result.error || 'Failed to delete member');
        }
      } catch (error) {
        message.error('Failed to delete member');
      }
    },
  });
}

onMounted(() => {
  loadTeam();
});
</script>

<template>
  <Page title="Team" description="Manage your team members">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search members..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="departmentFilter"
              placeholder="All Departments"
              style="width: 180px"
              allow-clear
            >
              <SelectOption v-for="dept in departments" :key="dept" :value="dept">
                {{ dept }}
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add Member
          </Button>
        </div>

        <Table
          :data-source="filteredMembers"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <Space>
                <Avatar :style="{ backgroundColor: '#1890ff' }">
                  {{ getInitials(record.first_name, record.last_name) }}
                </Avatar>
                <div>
                  <div class="font-medium">{{ record.first_name }} {{ record.last_name }}</div>
                </div>
              </Space>
            </template>
            <template v-else-if="column.key === 'department'">
              <Tag color="blue">{{ record.department || '-' }}</Tag>
            </template>
            <template v-else-if="column.key === 'position'">
              <Tag color="purple">{{ record.position || '-' }}</Tag>
            </template>
            <template v-else-if="column.key === 'is_active'">
              <Tag :color="getStatusColor(record.is_active)">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <Dropdown>
                <template #overlay>
                  <Menu>
                    <MenuItem key="edit" @click="openModal(record)">
                      <EditOutlined /> Edit
                    </MenuItem>
                    <MenuItem key="delete" danger @click="handleDelete(record)">
                      <DeleteOutlined /> Delete
                    </MenuItem>
                  </Menu>
                </template>
                <Button type="text">
                  <MoreOutlined />
                </Button>
              </Dropdown>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingMember ? 'Edit Member' : 'Add Member'"
        @ok="handleSave"
        :confirm-loading="saving"
        width="600px"
      >
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="First Name" required>
                <AntInput v-model:value="formState.first_name" placeholder="First name" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Last Name" required>
                <AntInput v-model:value="formState.last_name" placeholder="Last name" />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Email" required>
            <AntInput v-model:value="formState.email" placeholder="Email" :disabled="!!editingMember" />
          </FormItem>
          <FormItem label="Phone">
            <AntInput v-model:value="formState.phone" placeholder="Phone number" />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Department">
                <Select v-model:value="formState.department" placeholder="Select department" allow-clear>
                  <SelectOption v-for="dept in departments" :key="dept" :value="dept">
                    {{ dept }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Position">
                <AntInput v-model:value="formState.position" placeholder="Position" />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Active">
            <Switch v-model:checked="formState.is_active" />
          </FormItem>
        </Form>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.font-medium {
  font-weight: 500;
}
</style>
