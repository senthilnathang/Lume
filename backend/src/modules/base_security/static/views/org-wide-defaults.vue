<script setup>
/**
 * Organization-Wide Defaults View
 *
 * Manage baseline sharing settings for each object.
 * Sets the default access level for records users don't own.
 */

import { Page } from '@vben/common-ui';
import {
  Alert,
  Button,
  Card,
  Form,
  FormItem,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  GlobalOutlined,
  EditOutlined,
  ReloadOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';
import { ref, reactive, onMounted, computed } from 'vue';
import { useNotification } from '#/composables';
import {
  getOrgWideDefaultsApi,
  getOrgWideDefaultApi,
  updateOrgWideDefaultApi,
  SHARING_LEVELS,
} from '#/api/base_security';

defineOptions({ name: 'BaseOrgWideDefaults' });

const { showSuccess, showError } = useNotification();

// State
const loading = ref(false);
const actionLoading = ref(false);
const data = ref([]);
const editModalVisible = ref(false);
const inlineEditMode = ref(false);
const editingRecord = ref(null);
const editedData = ref({});

// Form state for modal
const form = reactive({
  object_name: '',
  object_label: '',
  internal_sharing: 'private',
  external_sharing: 'private',
  use_role_hierarchy: true,
});

// Sharing level options for dropdowns
const sharingOptions = SHARING_LEVELS.map(level => ({
  value: level.value,
  label: level.label,
}));

// Table columns
const columns = computed(() => {
  if (inlineEditMode.value) {
    return [
      {
        title: 'Object',
        dataIndex: 'object_label',
        key: 'object_label',
        width: 200,
      },
      {
        title: 'Internal Sharing',
        dataIndex: 'internal_sharing',
        key: 'internal_sharing',
        width: 200,
      },
      {
        title: 'External Sharing',
        dataIndex: 'external_sharing',
        key: 'external_sharing',
        width: 200,
      },
      {
        title: 'Use Role Hierarchy',
        dataIndex: 'use_role_hierarchy',
        key: 'use_role_hierarchy',
        width: 150,
        align: 'center',
      },
    ];
  }
  return [
    {
      title: 'Object',
      dataIndex: 'object_label',
      key: 'object_label',
      width: 200,
    },
    {
      title: 'API Name',
      dataIndex: 'object_name',
      key: 'object_name',
      width: 180,
    },
    {
      title: 'Internal Sharing',
      dataIndex: 'internal_sharing',
      key: 'internal_sharing',
      width: 180,
    },
    {
      title: 'External Sharing',
      dataIndex: 'external_sharing',
      key: 'external_sharing',
      width: 180,
    },
    {
      title: 'Use Role Hierarchy',
      dataIndex: 'use_role_hierarchy',
      key: 'use_role_hierarchy',
      width: 150,
      align: 'center',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
    },
  ];
});

// Get sharing level config
function getSharingLevelConfig(level) {
  return SHARING_LEVELS.find(l => l.value === level) || { label: level, color: 'default' };
}

// Fetch OWD data
async function fetchData() {
  loading.value = true;
  try {
    const res = await getOrgWideDefaultsApi();
    data.value = res.items || res || [];
    // Initialize editedData for inline editing
    editedData.value = {};
    data.value.forEach(item => {
      editedData.value[item.object_name] = {
        internal_sharing: item.internal_sharing,
        external_sharing: item.external_sharing,
        use_role_hierarchy: item.use_role_hierarchy,
      };
    });
  } catch (err) {
    showError('Failed to load organization-wide defaults');
    console.error(err);
  } finally {
    loading.value = false;
  }
}

// Open edit modal
function openEditModal(record) {
  editingRecord.value = record;
  Object.assign(form, {
    object_name: record.object_name,
    object_label: record.object_label || record.object_name,
    internal_sharing: record.internal_sharing || 'private',
    external_sharing: record.external_sharing || 'private',
    use_role_hierarchy: record.use_role_hierarchy !== false,
  });
  editModalVisible.value = true;
}

// Save single OWD from modal
async function saveOWD() {
  actionLoading.value = true;
  try {
    await updateOrgWideDefaultApi(form.object_name, {
      internal_sharing: form.internal_sharing,
      external_sharing: form.external_sharing,
      use_role_hierarchy: form.use_role_hierarchy,
    });
    showSuccess('Organization-wide default updated');
    editModalVisible.value = false;
    await fetchData();
  } catch (err) {
    showError(err.response?.data?.detail || 'Failed to update organization-wide default');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

// Toggle inline edit mode
function toggleInlineEditMode() {
  if (inlineEditMode.value) {
    // Exiting inline edit mode without saving - reset
    data.value.forEach(item => {
      editedData.value[item.object_name] = {
        internal_sharing: item.internal_sharing,
        external_sharing: item.external_sharing,
        use_role_hierarchy: item.use_role_hierarchy,
      };
    });
  }
  inlineEditMode.value = !inlineEditMode.value;
}

// Save all inline edits
async function saveAllInlineEdits() {
  actionLoading.value = true;
  try {
    const updates = [];
    for (const item of data.value) {
      const edited = editedData.value[item.object_name];
      if (
        edited.internal_sharing !== item.internal_sharing ||
        edited.external_sharing !== item.external_sharing ||
        edited.use_role_hierarchy !== item.use_role_hierarchy
      ) {
        updates.push(
          updateOrgWideDefaultApi(item.object_name, {
            internal_sharing: edited.internal_sharing,
            external_sharing: edited.external_sharing,
            use_role_hierarchy: edited.use_role_hierarchy,
          })
        );
      }
    }

    if (updates.length === 0) {
      showSuccess('No changes to save');
      inlineEditMode.value = false;
      return;
    }

    await Promise.all(updates);
    showSuccess(`Updated ${updates.length} organization-wide default(s)`);
    inlineEditMode.value = false;
    await fetchData();
  } catch (err) {
    showError('Failed to save some updates');
    console.error(err);
  } finally {
    actionLoading.value = false;
  }
}

// Update inline edit value
function updateInlineValue(objectName, field, value) {
  if (!editedData.value[objectName]) {
    editedData.value[objectName] = {};
  }
  editedData.value[objectName][field] = value;
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
            <GlobalOutlined class="mr-2 text-lg" />
            <span>Organization-Wide Defaults</span>
          </div>
        </template>
        <template #extra>
          <Space>
            <Button @click="fetchData" :loading="loading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <template v-if="inlineEditMode">
              <Button @click="toggleInlineEditMode">Cancel</Button>
              <Button type="primary" @click="saveAllInlineEdits" :loading="actionLoading">
                <template #icon><SaveOutlined /></template>
                Save All Changes
              </Button>
            </template>
            <template v-else>
              <Button type="primary" @click="toggleInlineEditMode">
                <template #icon><EditOutlined /></template>
                Edit All
              </Button>
            </template>
          </Space>
        </template>

        <!-- Info Alert -->
        <Alert
          class="mb-4"
          type="info"
          show-icon
        >
          <template #message>
            <span class="font-medium">About Organization-Wide Defaults</span>
          </template>
          <template #description>
            <p class="mb-2">
              Organization-Wide Defaults (OWD) set the baseline level of access that users have to records they don't own.
              More restrictive settings can be opened up using sharing rules, while less restrictive settings cannot be further restricted.
            </p>
            <ul class="list-disc ml-4">
              <li><strong>Private:</strong> Only the record owner and users above them in the role hierarchy can view and edit</li>
              <li><strong>Public Read Only:</strong> All users can view, but only the owner can edit</li>
              <li><strong>Public Read/Write:</strong> All users can view and edit all records</li>
            </ul>
          </template>
        </Alert>

        <!-- Table -->
        <Table
          :columns="columns"
          :dataSource="data"
          :pagination="false"
          :rowKey="record => record.object_name"
          size="middle"
        >
          <!-- Object Label -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'object_label'">
              <div class="font-medium">{{ record.object_label || record.object_name }}</div>
              <div v-if="inlineEditMode" class="text-xs text-gray-400">{{ record.object_name }}</div>
            </template>

            <!-- Internal Sharing -->
            <template v-else-if="column.key === 'internal_sharing'">
              <template v-if="inlineEditMode">
                <Select
                  :value="editedData[record.object_name]?.internal_sharing"
                  @change="val => updateInlineValue(record.object_name, 'internal_sharing', val)"
                  :options="sharingOptions"
                  style="width: 160px"
                  size="small"
                />
              </template>
              <template v-else>
                <Tag :color="getSharingLevelConfig(record.internal_sharing).color">
                  {{ getSharingLevelConfig(record.internal_sharing).label }}
                </Tag>
              </template>
            </template>

            <!-- External Sharing -->
            <template v-else-if="column.key === 'external_sharing'">
              <template v-if="inlineEditMode">
                <Select
                  :value="editedData[record.object_name]?.external_sharing"
                  @change="val => updateInlineValue(record.object_name, 'external_sharing', val)"
                  :options="sharingOptions"
                  style="width: 160px"
                  size="small"
                />
              </template>
              <template v-else>
                <Tag :color="getSharingLevelConfig(record.external_sharing).color">
                  {{ getSharingLevelConfig(record.external_sharing).label }}
                </Tag>
              </template>
            </template>

            <!-- Use Role Hierarchy -->
            <template v-else-if="column.key === 'use_role_hierarchy'">
              <template v-if="inlineEditMode">
                <Switch
                  :checked="editedData[record.object_name]?.use_role_hierarchy"
                  @change="val => updateInlineValue(record.object_name, 'use_role_hierarchy', val)"
                  size="small"
                />
              </template>
              <template v-else>
                <Tag :color="record.use_role_hierarchy ? 'green' : 'default'">
                  {{ record.use_role_hierarchy ? 'Yes' : 'No' }}
                </Tag>
              </template>
            </template>

            <!-- Actions -->
            <template v-else-if="column.key === 'actions'">
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  @click="openEditModal(record)"
                >
                  <template #icon><EditOutlined /></template>
                </Button>
              </Tooltip>
            </template>
          </template>
        </Table>

        <!-- Empty state -->
        <div v-if="!loading && data.length === 0" class="text-center py-8 text-gray-400">
          No organization-wide defaults configured. Objects will use default private sharing.
        </div>
      </Card>
    </Spin>

    <!-- Edit Modal -->
    <Modal
      v-model:open="editModalVisible"
      :title="`Edit OWD: ${form.object_label}`"
      :confirmLoading="actionLoading"
      @ok="saveOWD"
      width="500px"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Object">
          <div class="font-medium">{{ form.object_label }}</div>
          <div class="text-xs text-gray-400">API Name: {{ form.object_name }}</div>
        </FormItem>

        <FormItem label="Internal Sharing" required>
          <Select
            v-model:value="form.internal_sharing"
            :options="sharingOptions"
            placeholder="Select internal sharing level"
          />
          <div class="text-xs text-gray-400 mt-1">
            Default sharing level for users within the organization
          </div>
        </FormItem>

        <FormItem label="External Sharing" required>
          <Select
            v-model:value="form.external_sharing"
            :options="sharingOptions"
            placeholder="Select external sharing level"
          />
          <div class="text-xs text-gray-400 mt-1">
            Default sharing level for external users (partners, customers)
          </div>
        </FormItem>

        <FormItem label="Grant Access Using Role Hierarchy">
          <Switch v-model:checked="form.use_role_hierarchy" />
          <span class="ml-2 text-gray-500">
            {{ form.use_role_hierarchy ? 'Enabled' : 'Disabled' }}
          </span>
          <div class="text-xs text-gray-400 mt-1">
            When enabled, users higher in the role hierarchy automatically gain access to records owned by their subordinates
          </div>
        </FormItem>

        <Alert type="warning" show-icon class="mt-4">
          <template #message>
            Changing organization-wide defaults affects all users immediately. More restrictive
            settings may block access to records that users currently have access to.
          </template>
        </Alert>
      </Form>
    </Modal>
  </Page>
</template>
