<script>
/**
 * Rollup Fields View
 *
 * Manage rollup summary fields that aggregate data from child records:
 * - COUNT, SUM, AVG, MIN, MAX aggregations
 * - Filter criteria for selective rollups
 * - Manual and scheduled recomputation
 */

import { Page } from '@vben/common-ui';
import {
  Alert as AAlert,
  Button as AButton,
  Card as ACard,
  Form as AForm,
  FormItem,
  InputNumber as AInputNumber,
  Modal as AModal,
  Popconfirm as APopconfirm,
  Select as ASelect,
  SelectOption,
  Space as ASpace,
  Spin as ASpin,
  Table as ATable,
  Tabs as ATabs,
  Tag as ATag,
  Tooltip as ATooltip,
  TabPane,
} from 'ant-design-vue';
import {
  CalculatorOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  SyncOutlined,
} from '@ant-design/icons-vue';
import { ref, reactive, onMounted, defineAsyncComponent } from 'vue';
import { useNotification } from '#/composables';
import {
  getRollupFieldsApi,
  deleteRollupFieldApi,
  computeRollupApi,
  recomputeRollupApi,
  getRollupLogsApi,
  AGGREGATION_FUNCTIONS,
} from '#/api/base_automation';

export default {
  name: 'BaseRollupFields',
  components: {
    Page,
    ATable,
    ACard,
    AButton,
    AModal,
    AForm,
    AFormItem: FormItem,
    ASelect,
    ASelectOption: SelectOption,
    ATag,
    ASpace,
    ASpin,
    ATooltip,
    APopconfirm,
    ATabs,
    ATabPane: ATabPane,
    AAlert,
    AInputNumber,
    CalculatorOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    FilterOutlined,
    PlayCircleOutlined,
    HistoryOutlined,
    SyncOutlined,
    RollupFieldForm: defineAsyncComponent(() => import('./rollup-fields-form.vue')),
  },
  setup() {
    const { showSuccess, showError } = useNotification();

    // Form view state
    const showForm = ref(false);
    const editingFieldId = ref(null);

    // Active tab
    const activeTab = ref('rollups');

    // ============================================================================
    // ROLLUP FIELDS TAB
    // ============================================================================

    const loading = ref(false);
    const actionLoading = ref(false);
    const data = ref([]);
    const pagination = ref({
      current: 1,
      pageSize: 20,
      total: 0,
      showSizeChanger: true,
      showTotal: (total) => `Total ${total} rollup fields`,
    });
    const filters = reactive({
      parent_model: null,
      child_model: null,
      aggregation_function: null,
    });

    // Compute modal
    const computeModalVisible = ref(false);
    const computeForm = reactive({
      rollup_id: null,
      rollup_name: '',
      parent_id: null,
    });

    // Available models (would come from API)
    const availableModels = ref([
      { value: 'Account', label: 'Account' },
      { value: 'Contact', label: 'Contact' },
      { value: 'Opportunity', label: 'Opportunity' },
      { value: 'Case', label: 'Case' },
      { value: 'Employee', label: 'Employee' },
      { value: 'Department', label: 'Department' },
      { value: 'Project', label: 'Project' },
      { value: 'Task', label: 'Task' },
      { value: 'Invoice', label: 'Invoice' },
      { value: 'InvoiceLine', label: 'Invoice Line' },
    ]);

    // Aggregation function options
    const aggregationOptions = AGGREGATION_FUNCTIONS.map(f => ({
      value: f.value,
      label: f.label,
    }));

    // Table columns
    const columns = [
      { title: 'Name', dataIndex: 'name', key: 'name', width: 180 },
      { title: 'Parent Model', dataIndex: 'parent_model', key: 'parent_model', width: 120 },
      { title: 'Child Model', dataIndex: 'child_model', key: 'child_model', width: 120 },
      { title: 'Function', dataIndex: 'aggregation', key: 'aggregation', width: 100, align: 'center' },
      { title: 'Source Field', dataIndex: 'source_field', key: 'source_field', width: 120 },
      { title: 'Status', dataIndex: 'is_active', key: 'is_active', width: 100, align: 'center' },
      { title: 'Actions', key: 'actions', width: 160, align: 'center', fixed: 'right' },
    ];

    // Get aggregation function label
    function getAggregationLabel(fn) {
      const config = AGGREGATION_FUNCTIONS.find(f => f.value === fn);
      return config ? config.label : fn;
    }

    // Get aggregation color
    function getAggregationColor(fn) {
      const colors = {
        COUNT: 'blue',
        SUM: 'green',
        AVG: 'orange',
        MIN: 'purple',
        MAX: 'red',
        COUNT_DISTINCT: 'cyan',
      };
      return colors[fn] || 'default';
    }

    // Fetch data
    async function fetchData() {
      loading.value = true;
      try {
        const params = {
          page: pagination.value.current,
          page_size: pagination.value.pageSize,
        };
        if (filters.parent_model) params.parent_model = filters.parent_model;
        if (filters.child_model) params.child_model = filters.child_model;

        const res = await getRollupFieldsApi(params);
        data.value = res.items || [];
        pagination.value.total = res.total || 0;
      } catch (err) {
        showError('Failed to load rollup fields');
        console.error(err);
      } finally {
        loading.value = false;
      }
    }

    // Handle table change
    function handleTableChange(pag) {
      pagination.value.current = pag.current;
      pagination.value.pageSize = pag.pageSize;
      fetchData();
    }

    // Form view handlers
    function openCreateForm() {
      editingFieldId.value = null;
      showForm.value = true;
    }

    function openEditForm(record) {
      editingFieldId.value = record.id;
      showForm.value = true;
    }

    function handleFormBack() {
      showForm.value = false;
      editingFieldId.value = null;
    }

    function handleFormSaved() {
      fetchData();
    }

    // Delete rollup field
    async function deleteRollupField(record) {
      try {
        actionLoading.value = true;
        await deleteRollupFieldApi(record.id);
        showSuccess('Rollup field deleted');
        await fetchData();
      } catch (err) {
        showError(err.response?.data?.detail || 'Failed to delete rollup field');
      } finally {
        actionLoading.value = false;
      }
    }

    // Open compute modal
    function openComputeModal(record) {
      computeForm.rollup_id = record.id;
      computeForm.rollup_name = record.name;
      computeForm.parent_id = null;
      computeModalVisible.value = true;
    }

    // Compute rollup for specific parent
    async function computeRollup() {
      if (!computeForm.parent_id) {
        showError('Parent record ID is required');
        return;
      }
      try {
        actionLoading.value = true;
        await computeRollupApi(computeForm.rollup_id, computeForm.parent_id);
        showSuccess('Rollup computed successfully');
        computeModalVisible.value = false;
      } catch (err) {
        showError(err.response?.data?.detail || 'Failed to compute rollup');
      } finally {
        actionLoading.value = false;
      }
    }

    // Recompute all for a rollup field
    async function recomputeAll(record) {
      try {
        actionLoading.value = true;
        await recomputeRollupApi(record.id);
        showSuccess('Recompute started for all records');
      } catch (err) {
        showError(err.response?.data?.detail || 'Failed to start recompute');
      } finally {
        actionLoading.value = false;
      }
    }

    // Reset filters
    function resetFilters() {
      filters.parent_model = null;
      filters.child_model = null;
      filters.aggregation_function = null;
      pagination.value.current = 1;
      fetchData();
    }

    // ============================================================================
    // LOGS TAB
    // ============================================================================

    const logsLoading = ref(false);
    const logs = ref([]);
    const logsPagination = ref({ current: 1, pageSize: 20, total: 0 });
    const logsRollupFilter = ref(null);

    const logColumns = [
      { title: 'Date', dataIndex: 'computed_at', key: 'computed_at', width: 180 },
      { title: 'Parent ID', dataIndex: 'parent_id', key: 'parent_id', width: 100 },
      { title: 'Value', dataIndex: 'computed_value', key: 'computed_value', width: 100, align: 'right' },
      { title: 'Child Count', dataIndex: 'child_count', key: 'child_count', width: 100, align: 'right' },
      { title: 'Duration (ms)', dataIndex: 'computation_time_ms', key: 'computation_time_ms', width: 100, align: 'right' },
      { title: 'Status', dataIndex: 'status', key: 'status', width: 100, align: 'center' },
    ];

    async function fetchLogs() {
      logsLoading.value = true;
      try {
        let res;
        if (logsRollupFilter.value) {
          res = await getRollupLogsApi(logsRollupFilter.value, {
            page: logsPagination.value.current,
            page_size: logsPagination.value.pageSize,
          });
        } else {
          // Would need a generic logs endpoint - for now simulate
          res = { items: [], total: 0 };
        }
        logs.value = res.items || [];
        logsPagination.value.total = res.total || 0;
      } catch (err) {
        showError('Failed to load rollup logs');
      } finally {
        logsLoading.value = false;
      }
    }

    // Rollup options for filter
    const rollupOptions = ref([]);

    function updateRollupOptions() {
      rollupOptions.value = data.value.map(r => ({ value: r.id, label: r.name }));
    }

    // Tab change handler
    function handleTabChange(key) {
      activeTab.value = key;
      if (key === 'rollups') {
        fetchData();
      } else if (key === 'logs') {
        updateRollupOptions();
        fetchLogs();
      }
    }

    function handleLogsTableChange(pag) {
      logsPagination.value.current = pag.current;
      fetchLogs();
    }

    function handleFilterChange() {
      pagination.value.current = 1;
      fetchData();
    }

    function handleLogsFilterChange() {
      logsPagination.value.current = 1;
      fetchLogs();
    }

    onMounted(() => {
      fetchData();
    });

    return {
      // Form state
      showForm,
      editingFieldId,
      activeTab,

      // Rollup fields
      loading,
      actionLoading,
      data,
      pagination,
      filters,
      columns,
      availableModels,
      aggregationOptions,

      // Compute modal
      computeModalVisible,
      computeForm,

      // Logs
      logsLoading,
      logs,
      logsPagination,
      logsRollupFilter,
      logColumns,
      rollupOptions,

      // Methods
      fetchData,
      handleTableChange,
      openCreateForm,
      openEditForm,
      handleFormBack,
      handleFormSaved,
      deleteRollupField,
      openComputeModal,
      computeRollup,
      recomputeAll,
      resetFilters,
      fetchLogs,
      updateRollupOptions,
      handleTabChange,
      handleLogsTableChange,
      handleFilterChange,
      handleLogsFilterChange,
      getAggregationLabel,
      getAggregationColor,
    };
  },
};
</script>

<template>
  <!-- Show Form View when creating/editing -->
  <RollupFieldForm
    v-if="showForm"
    :field-id="editingFieldId"
    @back="handleFormBack"
    @saved="handleFormSaved"
  />

  <!-- Show List View -->
  <Page v-else auto-content-height>
    <ACard>
      <template #title>
        <div class="flex items-center">
          <CalculatorOutlined class="mr-2 text-lg" />
          <span>Roll-up Summary Fields</span>
        </div>
      </template>

      <AAlert
        class="mb-4"
        type="info"
        show-icon
        message="Rollup summary fields automatically calculate aggregations (COUNT, SUM, AVG, MIN, MAX) from child records into parent records."
      />

      <ATabs v-model:activeKey="activeTab" @change="handleTabChange">
        <!-- Rollup Fields Tab -->
        <ATabPane key="rollups" tab="Rollup Fields">
          <!-- Filters -->
          <div class="mb-4 flex flex-wrap gap-4 justify-between">
            <ASpace>
              <ASelect
                v-model:value="filters.parent_model"
                placeholder="Parent Model"
                style="width: 150px"
                allowClear
                :options="availableModels"
                @change="handleFilterChange"
              />
              <ASelect
                v-model:value="filters.child_model"
                placeholder="Child Model"
                style="width: 150px"
                allowClear
                :options="availableModels"
                @change="handleFilterChange"
              />
              <ASelect
                v-model:value="filters.aggregation_function"
                placeholder="Function"
                style="width: 120px"
                allowClear
                :options="aggregationOptions"
                @change="handleFilterChange"
              />
              <AButton @click="resetFilters">
                <template #icon><FilterOutlined /></template>
                Reset
              </AButton>
            </ASpace>
            <ASpace>
              <AButton @click="fetchData" :loading="loading">
                <template #icon><ReloadOutlined /></template>
                Refresh
              </AButton>
              <AButton type="primary" @click="openCreateForm">
                <template #icon><PlusOutlined /></template>
                New Rollup Field
              </AButton>
            </ASpace>
          </div>

          <ASpin :spinning="loading">
            <ATable
              :columns="columns"
              :dataSource="data"
              :pagination="pagination"
              :loading="loading"
              @change="handleTableChange"
              rowKey="id"
              size="middle"
              :scroll="{ x: 1000 }"
            >
              <template #bodyCell="{ column, record }">
                <!-- Name -->
                <template v-if="column.key === 'name'">
                  <div class="font-medium">{{ record.name }}</div>
                  <div class="text-xs text-gray-400">{{ record.code }}</div>
                </template>

                <!-- Aggregation Function -->
                <template v-else-if="column.key === 'aggregation'">
                  <ATag :color="getAggregationColor(record.aggregation)">
                    {{ getAggregationLabel(record.aggregation) }}
                  </ATag>
                </template>

                <!-- Status -->
                <template v-else-if="column.key === 'is_active'">
                  <ATag :color="record.is_active ? 'green' : 'default'">
                    {{ record.is_active ? 'Active' : 'Inactive' }}
                  </ATag>
                </template>

                <!-- Actions -->
                <template v-else-if="column.key === 'actions'">
                  <ASpace>
                    <ATooltip title="Compute">
                      <AButton type="text" size="small" @click="openComputeModal(record)">
                        <template #icon><PlayCircleOutlined /></template>
                      </AButton>
                    </ATooltip>
                    <ATooltip title="Recompute All">
                      <APopconfirm
                        title="Recompute all parent records?"
                        @confirm="recomputeAll(record)"
                      >
                        <AButton type="text" size="small">
                          <template #icon><SyncOutlined /></template>
                        </AButton>
                      </APopconfirm>
                    </ATooltip>
                    <ATooltip title="Edit">
                      <AButton type="text" size="small" @click="openEditForm(record)">
                        <template #icon><EditOutlined /></template>
                      </AButton>
                    </ATooltip>
                    <APopconfirm
                      title="Delete this rollup field?"
                      @confirm="deleteRollupField(record)"
                      okType="danger"
                    >
                      <ATooltip title="Delete">
                        <AButton type="text" size="small" danger>
                          <template #icon><DeleteOutlined /></template>
                        </AButton>
                      </ATooltip>
                    </APopconfirm>
                  </ASpace>
                </template>
              </template>
            </ATable>
          </ASpin>
        </ATabPane>

        <!-- Logs Tab -->
        <ATabPane key="logs">
          <template #tab>
            <span><HistoryOutlined class="mr-1" />Computation Logs</span>
          </template>

          <div class="mb-4 flex gap-4">
            <ASelect
              v-model:value="logsRollupFilter"
              placeholder="Select Rollup Field"
              style="width: 250px"
              allowClear
              :options="rollupOptions"
              @change="handleLogsFilterChange"
            />
            <AButton @click="fetchLogs" :loading="logsLoading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </AButton>
          </div>

          <ASpin :spinning="logsLoading">
            <ATable
              :columns="logColumns"
              :dataSource="logs"
              :pagination="logsPagination"
              @change="handleLogsTableChange"
              rowKey="id"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'computed_at'">
                  {{ record.computed_at ? record.computed_at.replace('T', ' ').slice(0, 19) : '-' }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <ATag :color="record.status === 'success' ? 'green' : 'red'">
                    {{ record.status }}
                  </ATag>
                </template>
              </template>
            </ATable>

            <div v-if="!logsRollupFilter && logs.length === 0" class="text-center py-8 text-gray-400">
              Select a rollup field to view computation logs
            </div>
          </ASpin>
        </ATabPane>
      </ATabs>
    </ACard>

    <!-- Compute Modal -->
    <AModal
      v-model:open="computeModalVisible"
      :title="`Compute: ${computeForm.rollup_name}`"
      :confirmLoading="actionLoading"
      @ok="computeRollup"
      width="400px"
    >
      <AForm layout="vertical" class="mt-4">
        <AFormItem label="Parent Record ID" required>
          <AInputNumber
            v-model:value="computeForm.parent_id"
            :min="1"
            style="width: 100%"
            placeholder="Enter parent record ID"
          />
          <div class="text-xs text-gray-400 mt-1">
            Enter the ID of the parent record to compute the rollup for
          </div>
        </AFormItem>
      </AForm>
    </AModal>
  </Page>
</template>
