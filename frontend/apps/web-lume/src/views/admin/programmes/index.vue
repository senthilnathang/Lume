<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, computed } from 'vue';
import { Card, Button, Tag, Space, message, Modal, Form, Input, Select, DatePicker, InputNumber, Popconfirm } from 'ant-design-vue';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons-vue';
import api from '@/api';
import type { Programme, ProgrammeFormData } from '@/types/api';

const loading = ref(false);
const modalVisible = ref(false);
const isEdit = ref(false);
const editingId = ref<number | null>(null);
const formRef = ref<any>();
const currentViewMode = ref('list');

const formState = ref<ProgrammeFormData>({
  title: '',
  description: '',
  shortDescription: '',
  category: '',
  target_amount: 0,
  raised_amount: 0,
  start_date: null,
  end_date: null,
  status: 'ACTIVE'
});

// Category options
const categoryOptions = [
  { label: 'Education', value: 'Education' },
  { label: 'Healthcare', value: 'Healthcare' },
  { label: 'Women Empowerment', value: 'Women Empowerment' },
  { label: 'Environment', value: 'Environment' },
  { label: 'Rural Development', value: 'Rural Development' }
];

const statusOptions = [
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Archived', value: 'ARCHIVED' }
];

// Open create modal
const openCreateModal = () => {
  isEdit.value = false;
  editingId.value = null;
  formState.value = {
    title: '',
    description: '',
    shortDescription: '',
    category: '',
    target_amount: 0,
    raised_amount: 0,
    start_date: null,
    end_date: null,
    status: 'ACTIVE'
  };
  modalVisible.value = true;
};

// Handle view
const handleView = (record: Programme) => {
  // Navigate to view page
  console.log('View programme:', record);
};

// Handle edit
const handleEdit = (record: Programme) => {
  isEdit.value = true;
  editingId.value = record.id;
  formState.value = { ...record };
  modalVisible.value = true;
};

// Handle delete
const handleDelete = async (id: number) => {
  try {
    await api.delete(`/admin/programmes/${id}`);
    message.success('Programme deleted successfully');
    (apiTableRef.value as any)?.refresh();
  } catch (error) {
    message.error('Failed to delete programme');
  }
};

// Submit form
const handleSubmit = async () => {
  try {
    if (isEdit.value && editingId.value) {
      await api.put(`/admin/programmes/${editingId.value}`, formState.value);
      message.success('Programme updated successfully');
    } else {
      await api.post('/admin/programmes', formState.value);
      message.success('Programme created successfully');
    }
    modalVisible.value = false;
    refreshData();
  } catch (error) {
    message.error('Failed to save programme');
  }
};

// Refresh data
const refreshData = () => {
  // Trigger data refresh
  if (currentViewMode.value === 'list' && apiTableRef.value) {
    (apiTableRef.value as any).refresh();
  } else {
    // For other views, we would need to emit a refresh event
    console.log('Refreshing data for view:', currentViewMode.value);
  }
};

// View mode change
const handleViewChange = (mode: string) => {
  currentViewMode.value = mode;
  console.log('View mode changed to:', mode);
};

// Table ref
const apiTableRef = ref();

// Computed table columns
const tableColumns = computed(() => [
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
    sorter: true,
    filterable: true
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    sorter: true,
    render: (category) => h(Tag, { color: 'blue' }, category)
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    sorter: true,
    render: (status) => {
      const color = status === 'ACTIVE' ? 'green' : status === 'COMPLETED' ? 'blue' : 'default';
      return h(Tag, { color }, status);
    }
  },
  {
    title: 'Target Amount',
    dataIndex: 'target_amount',
    key: 'target_amount',
    sorter: true,
    render: (amount) => `$${amount?.toLocaleString() || 0}`
  },
  {
    title: 'Raised Amount',
    dataIndex: 'raised_amount',
    key: 'raised_amount',
    sorter: true,
    render: (amount) => `$${amount?.toLocaleString() || 0}`
  }
]);

// Computed grid columns
const gridColumns = computed(() => [
  {
    title: 'title',
    dataIndex: 'title',
    key: 'title'
  },
  {
    title: 'category',
    dataIndex: 'category',
    key: 'category'
  },
  {
    title: 'status',
    dataIndex: 'status',
    key: 'status'
  },
  {
    title: 'target_amount',
    dataIndex: 'target_amount',
    key: 'target_amount'
  },
  {
    title: 'raised_amount',
    dataIndex: 'raised_amount',
    key: 'raised_amount'
  },
  {
    title: 'start_date',
    dataIndex: 'start_date',
    key: 'start_date'
  },
  {
    title: 'end_date',
    dataIndex: 'end_date',
    key: 'end_date'
  }
]);

// Handle view mode actions
const handleListViewAction = (action: string, record: any) => {
  switch (action) {
    case 'view':
      handleView(record);
      break;
    case 'edit':
      handleEdit(record);
      break;
    case 'delete':
      handleDelete(record.id);
      break;
  }
};

const handleGridViewAction = (action: string, item: any) => {
  switch (action) {
    case 'view':
      handleView(item);
      break;
    case 'edit':
      handleEdit(item);
      break;
    case 'delete':
      handleDelete(item.id);
      break;
    case 'favorite':
      // Handle favorite logic
      console.log('Favorite action for:', item);
      break;
  }
};

const handleKanbanAction = (action: string, item: any) => {
  switch (action) {
    case 'view':
      handleView(item);
      break;
    case 'edit':
      handleEdit(item);
      break;
    case 'delete':
      handleDelete(item.id);
      break;
    case 'assign':
      console.log('Assign action for:', item);
      break;
  }
};

onMounted(() => {
  // Component mounted
});
</script>

<template>
  <div class="programmes-admin">
    <div class="programmes-admin">
      <!-- View Mode Switcher -->
      <div class="view-controls">
        <div class="view-controls-left">
          <h2>Programmes Management</h2>
          <div class="view-description">
            Switch between different view modes to manage programmes efficiently
          </div>
        </div>
        
        <div class="view-controls-right">
          <CreateButton
            :create-type="'create'"
            text="Add Programme"
            icon="PlusOutlined"
            @click="openCreateModal"
            size="middle"
          />
        </div>
      </div>
      
      <!-- View Switcher Component -->
      <ViewSwitcher
        v-model:value="currentViewMode"
        @change="handleViewChange"
        show-label
      />
    </div>

      <!-- List View -->
      <ListView
        v-if="currentViewMode === 'list'"
        :title="'Programmes List'"
        :data="fetchProgrammes.data"
        :loading="loading"
        :columns="tableColumns"
        :pagination="{ current: 1, pageSize: 20, total: fetchProgrammes.total }"
        :searchable="true"
        :filterable="true"
        :show-create="true"
        :create-text="'Add Programme'"
        :create-type="'create'"
        :refreshable="true"
        :actions="{ view: handleListViewAction, edit: handleListViewAction, delete: handleListViewAction }"
        @refresh="refreshData"
        @create="openCreateModal"
        @edit="handleListViewAction"
        @delete="handleListViewAction"
        @view="handleListViewAction"
      />

      <!-- Grid View -->
      <GridView
        v-else-if="currentViewMode === 'grid'"
        :title="'Programmes Grid'"
        :data="fetchProgrammes.data"
        :loading="loading"
        :pagination="{ current: 1, pageSize: 12, total: fetchProgrammes.total }"
        :grid-columns="4"
        :searchable="true"
        :filterable="true"
        :show-create="true"
        :create-text="'Add Programme'"
        :create-type="'create'"
        :refreshable="true"
        :actions="{ view: handleGridViewAction, edit: handleGridViewAction, delete: handleGridViewAction, favorite: handleGridViewAction }"
        @refresh="refreshData"
        @create="openCreateModal"
        @edit="handleGridViewAction"
        @delete="handleGridViewAction"
        @view="handleGridViewAction"
        @favorite="handleGridViewAction"
      />

      <!-- Kanban View -->
      <KanbanView
        v-else-if="currentViewMode === 'kanban'"
        :title="'Programmes Kanban'"
        :columns="kanbanColumns"
        :loading="loading"
        :show-create="true"
        :create-text="'Add Programme'"
        :create-type="'create'"
        :refreshable="true"
        :actions="{ view: handleKanbanAction, edit: handleKanbanAction, delete: handleKanbanAction, assign: handleKanbanAction }"
        @refresh="refreshData"
        @create="openCreateModal"
        @edit="handleKanbanAction"
        @delete="handleKanbanAction"
        @view="handleKanbanAction"
        @assign="handleKanbanAction"
        @item-move="(payload) => console.log('Item moved:', payload)"
      />

      <!-- Card View -->
      <GridView
        v-else-if="currentViewMode === 'card'"
        :title="'Programmes Cards'"
        :card-style="'detailed'"
        :data="fetchProgrammes.data"
        :loading="loading"
        :pagination="{ current: 1, pageSize: 9, total: fetchProgrammes.total }"
        :grid-columns="3"
        :searchable="true"
        :filterable="true"
        :show-create="true"
        :create-text="'Add Programme'"
        :create-type="'create'"
        :refreshable="true"
        :actions="{ view: handleGridViewAction, edit: handleGridViewAction, delete: handleGridViewAction, favorite: handleGridViewAction }"
        @refresh="refreshData"
        @create="openCreateModal"
        @edit="handleGridViewAction"
        @delete="handleGridViewAction"
        @view="handleGridViewAction"
        @favorite="handleGridViewAction"
      />
    </div>

    <!-- Create/Edit Modal (visible for all views) -->
    <Modal
      v-model:open="modalVisible"
      :title="isEdit ? 'Edit Programme' : 'Create Programme'"
      @ok="handleSubmit"
      @cancel="() => modalVisible = false"
      width="800px"
    >
      <Form
        ref="formRef"
        :model="formState"
        layout="vertical"
        @finish="handleSubmit"
      >
        <Form.Item label="Title" name="title" :rules="[{ required: true, message: 'Please enter title' }]">
          <Input v-model:value="formState.title" placeholder="Enter programme title" />
        </Form.Item>

        <Form.Item label="Description" name="description">
          <Input.TextArea v-model:value="formState.description" :rows="4" placeholder="Enter programme description" />
        </Form.Item>

        <Form.Item label="Short Description" name="shortDescription">
          <Input v-model:value="formState.shortDescription" placeholder="Enter short description" />
        </Form.Item>

        <Form.Item label="Category" name="category" :rules="[{ required: true, message: 'Please select category' }]">
          <Select v-model:value="formState.category" placeholder="Select category">
            <Select.Option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
              {{ cat.label }}
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Target Amount" name="targetAmount">
          <InputNumber v-model:value="formState.target_amount" :min="0" :precision="2" placeholder="Enter target amount" />
        </Form.Item>

        <Form.Item label="Raised Amount" name="raisedAmount">
          <InputNumber v-model:value="formState.raised_amount" :min="0" :precision="2" placeholder="Enter raised amount" />
        </Form.Item>

        <Form.Item label="Start Date" name="startDate">
          <DatePicker v-model:value="formState.start_date" placeholder="Select start date" />
        </Form.Item>

        <Form.Item label="End Date" name="endDate">
          <DatePicker v-model:value="formState.end_date" placeholder="Select end date" />
        </Form.Item>

        <Form.Item label="Status" name="status" :rules="[{ required: true, message: 'Please select status' }]">
          <Select v-model:value="formState.status" placeholder="Select status">
            <Select.Option v-for="stat in statusOptions" :key="stat.value" :value="stat.value">
              {{ stat.label }}
            </Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>

<style scoped>
.programmes-admin {
  padding: 24px;
  min-height: 100vh;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.view-controls-left h2 {
  margin: 0 0 8px 0;
  color: #1f2937;
  font-size: 24px;
  font-weight: 600;
}

.view-description {
  color: #6b7280;
  font-size: 14px;
  margin: 0;
}

.view-controls-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .view-controls {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .view-controls-right {
    justify-content: center;
  }
}

@media (max-width: 576px) {
  .programmes-admin {
    padding: 16px;
  }
  
  .view-controls {
    padding: 16px;
  }
}
</style>