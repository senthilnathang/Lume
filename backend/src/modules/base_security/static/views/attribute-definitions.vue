<script setup>
import { ref, onMounted } from 'vue'
import { Page } from '@vben/common-ui'
import {
  Button,
  Card,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Textarea,
  FormItem,
} from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons-vue'
import {
  getAttributeDefinitionsApi,
  getAttributeDefinitionApi,
  createAttributeDefinitionApi,
  updateAttributeDefinitionApi,
  deleteAttributeDefinitionApi,
} from '#/api/base_security'

// Define constants locally to avoid undefined issues during module loading
const ATTRIBUTE_SOURCES = [
  { value: 'user', label: 'User Attribute', description: 'From user profile' },
  { value: 'record', label: 'Record Attribute', description: 'From current record' },
  { value: 'environment', label: 'Environment', description: 'From request context' },
  { value: 'computed', label: 'Computed', description: 'Calculated expression' },
]

const ATTRIBUTE_DATA_TYPES = [
  { value: 'string', label: 'String' },
  { value: 'integer', label: 'Integer' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'DateTime' },
  { value: 'list', label: 'List' },
]

const sourceOptions = ATTRIBUTE_SOURCES.map(s => ({ value: s.value, label: s.label }))

defineOptions({
  name: 'AttributeDefinitions',
})

const loading = ref(false)
const saving = ref(false)
const attributes = ref([])
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
})

// Filters
const searchText = ref('')
const filterSource = ref('')

// Drawer
const showDrawer = ref(false)
const editingItem = ref(null)
const form = ref({
  name: '',
  code: '',
  description: '',
  source: 'user',
  data_type: 'string',
  source_config: {},
  is_active: true,
})

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
  { title: 'Source', key: 'source', width: 120 },
  { title: 'Data Type', key: 'data_type', width: 120 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
]

const getSourceColor = (source) => {
  const colors = {
    user: 'blue',
    record: 'green',
    environment: 'orange',
    computed: 'purple',
  }
  return colors[source] || 'default'
}

const getSourceLabel = (source) => {
  const found = ATTRIBUTE_SOURCES.find(s => s.value === source)
  return found ? found.label : source
}

const getDataTypeLabel = (type) => {
  const found = ATTRIBUTE_DATA_TYPES.find(t => t.value === type)
  return found ? found.label : type
}

const fetchAttributes = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    }
    if (searchText.value) params.search = searchText.value
    if (filterSource.value) params.source = filterSource.value

    const response = await getAttributeDefinitionsApi(params)
    attributes.value = response.items || []
    pagination.value.total = response.total || 0
  } catch (e) {
    message.error('Failed to load attributes')
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (pag) => {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  fetchAttributes()
}

const openCreate = () => {
  editingItem.value = null
  form.value = {
    name: '',
    code: '',
    description: '',
    source: 'user',
    data_type: 'string',
    source_config: {},
    is_active: true,
  }
  showDrawer.value = true
}

const openEdit = async (item) => {
  try {
    const response = await getAttributeDefinitionApi(item.id)
    const data = response.data || response
    editingItem.value = data
    form.value = {
      name: data.name || '',
      code: data.code || '',
      description: data.description || '',
      source: data.source || 'user',
      data_type: data.data_type || 'string',
      source_config: data.source_config || {},
      is_active: data.is_active !== false,
    }
    showDrawer.value = true
  } catch (e) {
    message.error('Failed to load attribute')
    console.error(e)
  }
}

const saveAttribute = async () => {
  if (!form.value.name || !form.value.code) {
    message.error('Name and Code are required')
    return
  }

  saving.value = true
  try {
    if (editingItem.value) {
      await updateAttributeDefinitionApi(editingItem.value.id, form.value)
      message.success('Attribute updated')
    } else {
      await createAttributeDefinitionApi(form.value)
      message.success('Attribute created')
    }
    showDrawer.value = false
    await fetchAttributes()
  } catch (e) {
    message.error('Failed to save attribute')
    console.error(e)
  } finally {
    saving.value = false
  }
}

const deleteAttribute = (item) => {
  Modal.confirm({
    title: 'Delete Attribute',
    content: `Are you sure you want to delete "${item.name}"?`,
    okText: 'Delete',
    okType: 'danger',
    async onOk() {
      try {
        await deleteAttributeDefinitionApi(item.id)
        message.success('Attribute deleted')
        await fetchAttributes()
      } catch (e) {
        message.error('Failed to delete attribute')
        console.error(e)
      }
    },
  })
}

const handleSearch = () => {
  pagination.value.current = 1
  fetchAttributes()
}

onMounted(() => {
  fetchAttributes()
})
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Attribute Definitions</h1>
          <p class="text-gray-500">Define attributes for ABAC rules</p>
        </div>
        <Button type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Add Attribute
        </Button>
      </div>

      <Card>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-3">
          <Input
            v-model:value="searchText"
            placeholder="Search attributes..."
            style="width: 200px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="filterSource"
            placeholder="Source"
            style="width: 140px"
            allow-clear
            :options="sourceOptions"
            @change="handleSearch"
          />
          <Button @click="fetchAttributes">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="attributes"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 800 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'source'">
              <Tag :color="getSourceColor(record.source)">
                {{ getSourceLabel(record.source) }}
              </Tag>
            </template>

            <template v-else-if="column.key === 'data_type'">
              <Tag>{{ getDataTypeLabel(record.data_type) }}</Tag>
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
                  <Button type="text" size="small" danger @click="deleteAttribute(record)">
                    <template #icon><DeleteOutlined /></template>
                  </Button>
                </Tooltip>
              </Space>
            </template>
          </template>

        </Table>

        <!-- Empty State -->
        <div v-if="!loading && attributes.length === 0" class="py-8 text-center">
          <TagsOutlined style="font-size: 48px; color: #d9d9d9" />
          <p class="mt-4 text-gray-500">No attributes found</p>
          <Button type="primary" class="mt-4" @click="openCreate">
            Add Your First Attribute
          </Button>
        </div>
      </Card>

      <!-- Edit Drawer -->
      <Drawer
        v-model:open="showDrawer"
        :title="editingItem ? 'Edit Attribute' : 'Add Attribute'"
        width="500"
        :footer-style="{ textAlign: 'right' }"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input v-model:value="form.name" placeholder="Department ID" />
          </FormItem>

          <FormItem label="Code" required>
            <Input v-model:value="form.code" placeholder="department_id" :disabled="!!editingItem" />
          </FormItem>

          <FormItem label="Description">
            <Textarea v-model:value="form.description" :rows="2" />
          </FormItem>

          <FormItem label="Source">
            <Select v-model:value="form.source" :options="sourceOptions" />
          </FormItem>

          <FormItem label="Data Type">
            <Select v-model:value="form.data_type" :options="ATTRIBUTE_DATA_TYPES" />
          </FormItem>

          <FormItem label="Source Configuration">
            <Textarea
              :value="JSON.stringify(form.source_config, null, 2)"
              @change="e => { try { form.source_config = JSON.parse(e.target.value || '{}') } catch {} }"
              :rows="4"
              placeholder='{"field": "department_id"}'
              style="font-family: monospace"
            />
            <div class="text-gray-400 text-xs mt-1">
              For USER source: {"field": "user_field_name"}<br>
              For COMPUTED: {"expression": "user.dept == record.dept"}
            </div>
          </FormItem>

          <FormItem label="Active">
            <Switch v-model:checked="form.is_active" />
          </FormItem>
        </Form>

        <template #footer>
          <Space>
            <Button @click="showDrawer = false">Cancel</Button>
            <Button type="primary" :loading="saving" @click="saveAttribute">Save</Button>
          </Space>
        </template>
      </Drawer>
    </div>
  </Page>
</template>
