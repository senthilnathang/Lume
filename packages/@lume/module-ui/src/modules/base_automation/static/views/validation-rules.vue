<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  TabPane,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getValidationRulesApi,
  deleteValidationRuleApi,
  testValidationRuleApi,
  getValidationLogsApi,
  VALIDATION_TRIGGERS,
} from '#/api/base_automation';
import ValidationRuleForm from './validation-rules-form.vue';

defineOptions({
  name: 'BaseValidationRules',
});

const { success: showSuccess, error: showError } = useNotification();

// Form view state
const showForm = ref(false);
const editingRuleId = ref(null);

const loading = ref(false);
const actionLoading = ref(false);
const rules = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  model_name: null,
  is_active: null,
});

const activeTab = ref('rules');

// Test modal
const testModalVisible = ref(false);
const testRule = ref(null);
const testValues = ref('{}');
const testResult = ref(null);
const testLoading = ref(false);

// Logs
const logs = ref([]);
const logsLoading = ref(false);
const logsPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const columns = [
  { title: 'Code', dataIndex: 'code', key: 'code', width: 150, ellipsis: true },
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200, ellipsis: true },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 180 },
  { title: 'Trigger', key: 'trigger_on', width: 120 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 90, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
];

const logColumns = [
  { title: 'Timestamp', key: 'timestamp', width: 180 },
  { title: 'Rule', dataIndex: 'rule_name', key: 'rule_name', width: 150 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Record ID', dataIndex: 'record_id', key: 'record_id', width: 100 },
  { title: 'Result', key: 'result', width: 100 },
  { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
];

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function getTriggerLabel(trigger) {
  const found = VALIDATION_TRIGGERS.find(t => t.value === trigger);
  return found ? found.label : trigger;
}

async function fetchRules() {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.value.model_name) params.model_name = filters.value.model_name;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getValidationRulesApi(params);
    rules.value = res.items || res || [];
    pagination.value.total = res.total || rules.value.length;
  } catch (err) {
    console.error('Failed to fetch validation rules:', err);
    showError('Failed to load validation rules');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchRules();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchRules();
}, { deep: true });

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
  fetchRules();
}

async function fetchLogs() {
  logsLoading.value = true;
  try {
    const params = {
      page: logsPagination.value.current,
      page_size: logsPagination.value.pageSize,
    };
    const res = await getValidationLogsApi(params);
    logs.value = res.items || res || [];
    logsPagination.value.total = res.total || logs.value.length;
  } catch (err) {
    console.error('Failed to fetch logs:', err);
    showError('Failed to load validation logs');
  } finally {
    logsLoading.value = false;
  }
}

function handleLogsTableChange(pag) {
  logsPagination.value.current = pag.current;
  logsPagination.value.pageSize = pag.pageSize;
  fetchLogs();
}

function handleTabChange(key) {
  activeTab.value = key;
  if (key === 'logs' && logs.value.length === 0) {
    fetchLogs();
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteValidationRuleApi(record.id);
    showSuccess('Validation rule deleted successfully');
    fetchRules();
  } catch (err) {
    console.error('Failed to delete validation rule:', err);
    showError(err.response?.data?.detail || 'Failed to delete validation rule');
  } finally {
    actionLoading.value = false;
  }
}

function openTestModal(record) {
  testRule.value = record;
  testValues.value = '{}';
  testResult.value = null;
  testModalVisible.value = true;
}

async function handleTest() {
  testLoading.value = true;
  testResult.value = null;

  try {
    let values;
    try {
      values = JSON.parse(testValues.value);
    } catch (e) {
      showError('Invalid JSON in test values');
      testLoading.value = false;
      return;
    }

    const res = await testValidationRuleApi(testRule.value.id, { values });
    testResult.value = res;
  } catch (err) {
    console.error('Failed to test rule:', err);
    showError(err.response?.data?.detail || 'Failed to test rule');
  } finally {
    testLoading.value = false;
  }
}

onMounted(() => {
  fetchRules();
});
</script>

<template>
  <!-- Show Form View when creating/editing -->
  <ValidationRuleForm
    v-if="showForm"
    :rule-id="editingRuleId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <Page v-else auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <CheckCircleOutlined />
            <span>Validation Rules</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateForm">
              <PlusOutlined /> New Rule
            </Button>
            <Button @click="fetchRules">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
          <TabPane key="rules" tab="Rules">
            <!-- Filters -->
            <div class="filters-row">
              <Space wrap>
                <Input
                  v-model:value="filters.model_name"
                  placeholder="Filter by model"
                  allow-clear
                  style="width: 200px"
                />
                <Select
                  v-model:value="filters.is_active"
                  placeholder="Filter by status"
                  allow-clear
                  style="width: 140px"
                >
                  <SelectOption :value="true">Active</SelectOption>
                  <SelectOption :value="false">Inactive</SelectOption>
                </Select>
              </Space>
            </div>

            <Table
              :columns="columns"
              :data-source="rules"
              :pagination="{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} rules`,
              }"
              :scroll="{ x: 1000 }"
              row-key="id"
              @change="handleTableChange"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'trigger_on'">
                  <Tag color="blue">{{ getTriggerLabel(record.trigger_on) }}</Tag>
                </template>
                <template v-if="column.key === 'is_active'">
                  <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
                  <CloseCircleOutlined v-else style="color: #ff4d4f" />
                </template>
                <template v-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Test Rule">
                      <Button size="small" @click="openTestModal(record)">
                        <PlayCircleOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button size="small" @click="openEditForm(record)">
                        <EditOutlined />
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Are you sure you want to delete this rule?"
                      @confirm="handleDelete(record)"
                      ok-text="Delete"
                      cancel-text="Cancel"
                    >
                      <Tooltip title="Delete">
                        <Button size="small" danger>
                          <DeleteOutlined />
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <TabPane key="logs" tab="Validation Logs">
            <Spin :spinning="logsLoading">
              <Table
                :columns="logColumns"
                :data-source="logs"
                :pagination="{
                  current: logsPagination.current,
                  pageSize: logsPagination.pageSize,
                  total: logsPagination.total,
                  showSizeChanger: true,
                }"
                row-key="id"
                @change="handleLogsTableChange"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'timestamp'">
                    {{ formatDate(record.created_at || record.timestamp) }}
                  </template>
                  <template v-if="column.key === 'result'">
                    <Tag :color="record.valid || record.result === 'passed' ? 'green' : 'red'">
                      {{ record.valid || record.result === 'passed' ? 'Passed' : 'Failed' }}
                    </Tag>
                  </template>
                </template>
              </Table>
              <div v-if="logs.length === 0 && !logsLoading" class="empty-state">
                No validation logs found
              </div>
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </Spin>

    <!-- Test Modal -->
    <Modal
      v-model:open="testModalVisible"
      :title="'Test Rule: ' + (testRule?.name || '')"
      @ok="handleTest"
      ok-text="Run Test"
      :confirm-loading="testLoading"
      width="600px"
    >
      <Form layout="vertical">
        <FormItem label="Test Values (JSON)">
          <Textarea
            v-model:value="testValues"
            :rows="6"
            placeholder='{"field1": "value1", "field2": "value2"}'
          />
          <div class="help-text">
            Enter test values as JSON. These will be used to evaluate the validation rule.
          </div>
        </FormItem>
      </Form>

      <div v-if="testResult" class="test-result">
        <h4>Test Result</h4>
        <Tag :color="testResult.valid ? 'green' : 'red'" style="margin-bottom: 8px">
          {{ testResult.valid ? 'Validation Passed' : 'Validation Failed' }}
        </Tag>
        <div v-if="!testResult.valid && testResult.errors" class="result-errors">
          <strong>Errors:</strong>
          <ul>
            <li v-for="(err, idx) in testResult.errors" :key="idx">{{ err }}</li>
          </ul>
        </div>
        <div v-if="testResult.warnings && testResult.warnings.length > 0" class="result-warnings">
          <strong>Warnings:</strong>
          <ul>
            <li v-for="(warn, idx) in testResult.warnings" :key="idx">{{ warn }}</li>
          </ul>
        </div>
      </div>
    </Modal>
  </Page>
</template>
