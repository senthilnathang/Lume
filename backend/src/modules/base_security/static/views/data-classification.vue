<script setup>
import { ref, onMounted } from 'vue'
import { Page } from '@vben/common-ui'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  FormItem,
} from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  FileProtectOutlined,
} from '@ant-design/icons-vue'
import {
  getDataClassificationsApi,
  getDataClassificationApi,
  createDataClassificationApi,
  updateDataClassificationApi,
  deleteDataClassificationApi,
} from '#/api/base_security'

// Define constants locally to avoid undefined issues during module loading
const CLASSIFICATION_LEVELS = [
  { value: 'public', label: 'Public', color: 'green', clearance: 0 },
  { value: 'internal', label: 'Internal', color: 'blue', clearance: 1 },
  { value: 'confidential', label: 'Confidential', color: 'orange', clearance: 2 },
  { value: 'restricted', label: 'Restricted', color: 'red', clearance: 3 },
]

const levelOptions = CLASSIFICATION_LEVELS.map(l => ({ value: l.value, label: l.label }))

defineOptions({
  name: 'DataClassification',
})

const loading = ref(false)
const saving = ref(false)
const classifications = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// Filters
const searchText = ref('')
const filterLevel = ref('')

// Drawer
const showDrawer = ref(false)
const editingItem = ref(null)
const form = ref({
  model_name: '',
  field_name: '',
  level: 'internal',
  required_clearance: 1,
  audit_access: false,
  audit_changes: true,
  is_active: true,
})

const columns = [
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Field', dataIndex: 'field_name', key: 'field_name', width: 150 },
  { title: 'Level', key: 'level', width: 130 },
  { title: 'Clearance', dataIndex: 'required_clearance', key: 'required_clearance', width: 100, align: 'center' },
  { title: 'Audit Access', key: 'audit_access', width: 110, align: 'center' },
  { title: 'Audit Changes', key: 'audit_changes', width: 120, align: 'center' },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
]

const getLevelColor = (level) => {
  const found = CLASSIFICATION_LEVELS.find(l => l.value === level)
  return found ? found.color : 'default'
}

const getLevelLabel = (level) => {
  const found = CLASSIFICATION_LEVELS.find(l => l.value === level)
  return found ? found.label : level
}

const fetchClassifications = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    }
    if (searchText.value) params.model_name = searchText.value
    if (filterLevel.value) params.level = filterLevel.value

    const response = await getDataClassificationsApi(params)
    classifications.value = response.items || []
    pagination.value.total = response.total || 0
  } catch (e) {
    message.error('Failed to load classifications')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchClassifications()
}

const openCreate = () => {
  editingItem.value = null
  form.value = {
    model_name: '',
    field_name: '',
    level: 'internal',
    required_clearance: 1,
    audit_access: false,
    audit_changes: true,
    is_active: true,
  }
  showDrawer.value = true
}

const openEdit = async (item) => {
  try {
    const response = await getDataClassificationApi(item.id)
    const data = response.data || response
    editingItem.value = data
    form.value = {
      model_name: data.model_name || '',
      field_name: data.field_name || '',
      level: data.level || 'internal',
      required_clearance: data.required_clearance || 1,
      audit_access: data.audit_access || false,
      audit_changes: data.audit_changes !== false,
      is_active: data.is_active !== false,
    }
    showDrawer.value = true
  } catch (e) {
    message.error('Failed to load classification')
    console.error(e)
  }
}

const saveClassification = async () => {
  if (!form.value.model_name) {
    message.error('Model name is required')
    return
  }

  saving.value = true
  try {
    if (editingItem.value) {
      await updateDataClassificationApi(editingItem.value.id, form.value)
      message.success('Classification updated')
    } else {
      await createDataClassificationApi(form.value)
      message.success('Classification created')
    }
    showDrawer.value = false
    await fetchClassifications()
  } catch (e) {
    message.error('Failed to save classification')
    console.error(e)
  } finally {
    saving.value = false
  }
}

const deleteClassification = (item) => {
  Modal.confirm({
    title: 'Delete Classification',
    content: `Are you sure you want to delete this classification?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteDataClassificationApi(item.id)
        message.success('Classification deleted')
        await fetchClassifications()
      } catch (e) {
        message.error('Failed to delete classification')
        console.error(e)
      }
    },
  })
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchClassifications()
}

onMounted(() => {
  fetchClassifications()
})
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Data Classification</h1>
          <p class="text-gray-500">Classify data by sensitivity level</p>
        </div>
        <Button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Add Classification
        </Button>
      </div>

      <Card>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-3">
          <Input
            v-model:value="searchText"
            placeholder="Filter by model..."
            style="width: 200px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="filterLevel"
            placeholder="Level"
            style="width: 140px"
            allow-clear
            :options="levelOptions"
            @change="handleSearch"
          />
          <Button @click="fetchClassifications">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="classifications"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1000 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'level'">
              <Tag :color="getLevelColor(record.level)">
                {{ getLevelLabel(record.level) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'audit_access'">
              <Tag :color="record.audit_access ? 'green' : 'default'">
                {{ record.audit_access ? 'Yes' : 'No' }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'audit_changes'">
              <Tag :color="record.audit_changes ? 'green' : 'default'">
                {{ record.audit_changes ? 'Yes' : 'No' }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'status'">
              <Tag :color="record.is_active ? 'success' : 'default'">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Edit">
                  <Button type="text" size="small" @click="openEdit(record)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Delete">
                  <Button type="text" size="small" danger @click="deleteClassification(record)">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>

        </Table>

        <!-- Empty State -->
        <div v-if="!loading && classifications.length === 0" class="py-8 text-center">
          <FileProtectOutlined style="font-size: 48px; color: #d9d9d9" />
          <p class="mt-4 text-gray-500">No classifications found</p>
          <Button type="primary" class="mt-4" @click="openCreate">
            Add Classification
          </Button>
        </div>
      </Card>

      <!-- Edit Drawer -->
      <Drawer
        v-model:open="showDrawer"
        :title="editingItem ? 'Edit Classification' : 'Add Classification'"
        width="500"
        :footer-style="{ textAlign: 'right' }"
      >
        <Form layout="vertical">
          <FormItem label="Model Name" required>
            <Input v-model:value="form.model_name" placeholder="employees" />
          </FormItem>

          <FormItem label="Field Name (optional)">
            <Input v-model:value="form.field_name" placeholder="salary (leave empty for entire model)" />
          </FormItem>

          <FormItem label="Classification Level">
            <Select v-model:value="form.level" :options="levelOptions" />
          </FormItem>

          <FormItem label="Required Clearance Level">
            <InputNumber v-model:value="form.required_clearance" :min="0" :max="10" style="width: 100%" />
          </FormItem>

          <FormItem label="Audit Access">
            <Switch v-model:checked="form.audit_access" />
            <span class="ml-2 text-gray-500">Log every read access</span>
          </FormItem>

          <FormItem label="Audit Changes">
            <Switch v-model:checked="form.audit_changes" />
            <span class="ml-2 text-gray-500">Log all modifications</span>
          </FormItem>

          <FormItem label="Active">
            <Switch v-model:checked="form.is_active" />
          </FormItem>
        </Form>

        <template #footer>
          <Space>
            <Button @click="showDrawer = false">Cancel</Button>
            <Button type="primary" :loading="saving" @click="saveClassification">Save</Button>
          </Space>
        </template>
      </Drawer>
    </div>
  </Page>
</template>
