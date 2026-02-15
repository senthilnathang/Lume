<script setup>
import { ref, onMounted, computed, h } from 'vue';

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
  Modal,
  Form,
  FormItem,
  Input as AntInput,
  DatePicker,
  Switch,
  Tooltip,
  Popconfirm,
  message,
  Spin,
  Row,
  Col,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons-vue';

import { Eye, Edit3, Trash2 } from 'lucide-vue-next';

defineOptions({
  name: 'ActivitiesList',
});

const loading = ref(false);
const saving = ref(false);
const searchText = ref('');
const typeFilter = ref(null);
const activities = ref([]);
const modalVisible = ref(false);
const editingActivity = ref(null);

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Start Date', dataIndex: 'start_date', key: 'start_date', width: 150 },
  { title: 'Location', dataIndex: 'location', key: 'location' },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 130 },
];

const activityCategories = ['Meeting', 'Event', 'Workshop', 'Training', 'Conference'];
const activityStatuses = ['draft', 'published', 'completed', 'cancelled'];

const formState = ref({
  title: '',
  description: '',
  category: '',
  start_date: '',
  end_date: '',
  location: '',
  status: 'draft',
  is_featured: false,
});

const filteredActivities = computed(() => {
  return activities.value.filter((activity) => {
    const matchesSearch =
      !searchText.value ||
      activity.title.toLowerCase().includes(searchText.value.toLowerCase()) ||
      (activity.location && activity.location.toLowerCase().includes(searchText.value.toLowerCase()));
    const matchesType = !typeFilter.value || activity.category === typeFilter.value;
    return matchesSearch && matchesType;
  });
});

function getCategoryColor(category) {
  const colors = { Meeting: 'blue', Event: 'green', Workshop: 'orange', Training: 'purple', Conference: 'cyan' };
  return colors[category] || 'default';
}

function getStatusColor(status) {
  const colors = { draft: 'default', published: 'blue', completed: 'green', cancelled: 'red' };
  return colors[status] || 'default';
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

async function loadActivities() {
  loading.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch('/api/activities', { headers });
    const result = await response.json();
    
    if (result.data) {
      activities.value = result.data;
    }
  } catch (error) {
    console.error('Failed to load activities:', error);
    message.error('Failed to load activities');
  } finally {
    loading.value = false;
  }
}

function openModal(activity = null) {
  editingActivity.value = activity;
  if (activity) {
    formState.value = {
      title: activity.title || '',
      description: activity.description || '',
      category: activity.category || '',
      start_date: activity.start_date || '',
      end_date: activity.end_date || '',
      location: activity.location || '',
      status: activity.status || 'draft',
      is_featured: activity.is_featured || false,
    };
  } else {
    formState.value = {
      title: '',
      description: '',
      category: '',
      start_date: '',
      end_date: '',
      location: '',
      status: 'draft',
      is_featured: false,
    };
  }
  modalVisible.value = true;
}

function closeModal() {
  modalVisible.value = false;
  editingActivity.value = null;
}

async function handleSave() {
  saving.value = true;
  try {
    const token = localStorage.getItem('accessToken');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let url = '/api/activities';
    let method = 'POST';

    if (editingActivity.value && editingActivity.value.id) {
      url = `/api/activities/${editingActivity.value.id}`;
      method = 'PUT';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(formState.value),
    });

    const result = await response.json();

    if (result.success || response.ok) {
      message.success(editingActivity.value ? 'Activity updated successfully' : 'Activity created successfully');
      closeModal();
      await loadActivities();
    } else {
      message.error(result.error || 'Failed to save activity');
    }
  } catch (error) {
    console.error('Failed to save activity:', error);
    message.error('Failed to save activity');
  } finally {
    saving.value = false;
  }
}

async function handleDelete(activity) {
  Modal.confirm({
    title: 'Delete Activity',
    content: `Are you sure you want to delete "${activity.title}"?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        const token = localStorage.getItem('accessToken');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`/api/activities/${activity.id}`, {
          method: 'DELETE',
          headers,
        });

        const result = await response.json();

        if (result.success || response.ok) {
          message.success('Activity deleted successfully');
          await loadActivities();
        } else {
          message.error(result.error || 'Failed to delete activity');
        }
      } catch (error) {
        message.error('Failed to delete activity');
      }
    },
  });
}

onMounted(() => {
  loadActivities();
});
</script>

<template>
  <Page title="Activities" description="Manage activities and events">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search activities..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="typeFilter"
              placeholder="All Types"
              style="width: 150px"
              allow-clear
            >
              <SelectOption v-for="type in activityCategories" :key="type" :value="type">
                {{ type }}
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openModal()">
            <PlusOutlined />
            Add Activity
          </Button>
        </div>

        <Table
          :data-source="filteredActivities"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'category'">
              <Tag :color="getCategoryColor(record.category)">{{ record.category || '-' }}</Tag>
            </template>
            <template v-else-if="column.key === 'start_date'">
              {{ formatDate(record.start_date) }}
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">{{ record.status }}</Tag>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="actions-cell flex items-center gap-1">
                <Tooltip title="View">
                  <Button type="text" size="small" @click="openModal(record)">
                    <template #icon><Eye :size="15" /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="openModal(record)">
                    <template #icon><Edit3 :size="15" /></template>
                  </Button>
                </Tooltip>
                <Popconfirm title="Delete this activity?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(record)">
                  <Tooltip title="Delete">
                    <Button type="text" size="small" danger>
                      <template #icon><Trash2 :size="15" /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </div>
            </template>
          </template>
        </Table>
      </Card>

      <Modal
        v-model:open="modalVisible"
        :title="editingActivity ? 'Edit Activity' : 'Add Activity'"
        @ok="handleSave"
        :confirm-loading="saving"
        width="700px"
      >
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="24">
              <FormItem label="Title" required>
                <AntInput v-model:value="formState.title" placeholder="Activity title" />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Category">
                <Select v-model:value="formState.category" placeholder="Select category" allow-clear>
                  <SelectOption v-for="cat in activityCategories" :key="cat" :value="cat">
                    {{ cat }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Status">
                <Select v-model:value="formState.status" placeholder="Select status">
                  <SelectOption v-for="status in activityStatuses" :key="status" :value="status">
                    {{ status }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Start Date">
                <DatePicker v-model:value="formState.start_date" style="width: 100%" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="End Date">
                <DatePicker v-model:value="formState.end_date" style="width: 100%" />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Location">
            <AntInput v-model:value="formState.location" placeholder="Event location" />
          </FormItem>
          <FormItem label="Description">
            <AntInput v-model:value="formState.description" type="textarea" :rows="3" placeholder="Activity description" />
          </FormItem>
          <FormItem label="Featured">
            <Switch v-model:checked="formState.is_featured" />
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

:deep(.actions-cell .ant-btn) {
  opacity: 0.55;
  transition: opacity 0.15s;
}

:deep(.ant-table-row:hover .actions-cell .ant-btn) {
  opacity: 1;
}
</style>
