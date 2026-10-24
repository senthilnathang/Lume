<script>
import { ref, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Button,
  Card,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Textarea,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyOutlined,
} from '@ant-design/icons-vue';
import {
  getAccessControlRulesApi,
  getAccessControlRuleApi,
  createAccessControlRuleApi,
  updateAccessControlRuleApi,
  deleteAccessControlRuleApi,
} from '#/api/base_security';

export default {
  name: 'ACLBuilder',
  components: {
    Page,
    AButton: Button,
    ACard: Card,
    ADrawer: Drawer,
    AForm: Form,
    AFormItem: FormItem,
    AInput: Input,
    ATextarea: Textarea,
    AInputNumber: InputNumber,
    ASelect: Select,
    ASpace: Space,
    ASwitch: Switch,
    ATable: Table,
    ATag: Tag,
    ATooltip: Tooltip,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    SearchOutlined,
    SafetyOutlined,
  },
  setup() {
    const loading = ref(false);
    const saving = ref(false);
    const rules = ref([]);
    const pagination = ref({
      current: 1,
      pageSize: 20,
      total: 0,
    });

    // Filters
    const searchText = ref('');
    const filterModel = ref('');

    // Drawer
    const showDrawer = ref(false);
    const editingRule = ref(null);
    const form = ref({
      name: '',
      code: '',
      description: '',
      target_model: '',
      permissions: [],
      field_permissions: {},
      conditions: [],
      effect: 'allow',
      priority: 100,
      is_active: true,
    });

    const columns = [
      { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
      { title: 'Target Model', dataIndex: 'target_model', key: 'target_model', width: 150 },
      { title: 'Effect', key: 'effect', width: 100 },
      { title: 'Permissions', key: 'permissions', width: 200 },
      { title: 'Status', key: 'status', width: 100 },
      { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
    ];

    const permissionOptions = [
      { value: 'read', label: 'Read' },
      { value: 'write', label: 'Write' },
      { value: 'create', label: 'Create' },
      { value: 'update', label: 'Update' },
      { value: 'delete', label: 'Delete' },
    ];

    const effectOptions = [
      { value: 'allow', label: 'Allow' },
      { value: 'deny', label: 'Deny' },
    ];

    const operatorOptions = [
      { value: 'eq', label: 'Equals' },
      { value: 'ne', label: 'Not Equals' },
      { value: 'in', label: 'In' },
    ];

    const fetchRules = async () => {
      loading.value = true;
      try {
        const params = {
          page: pagination.value.current,
          page_size: pagination.value.pageSize,
        };
        if (searchText.value) params.search = searchText.value;
        if (filterModel.value) params.target_model = filterModel.value;

        const response = await getAccessControlRulesApi(params);
        rules.value = response.items || [];
        pagination.value.total = response.total || 0;
      } catch (e) {
        message.error('Failed to load ACL rules');
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const handleTableChange = (pag) => {
      pagination.value.current = pag.current;
      pagination.value.pageSize = pag.pageSize;
      fetchRules();
    };

    const openCreate = () => {
      editingRule.value = null;
      form.value = {
        name: '',
        code: '',
        description: '',
        target_model: '',
        permissions: [],
        field_permissions: {},
        conditions: [],
        effect: 'allow',
        priority: 100,
        is_active: true,
      };
      showDrawer.value = true;
    };

    const openEdit = async (rule) => {
      try {
        const response = await getAccessControlRuleApi(rule.id);
        const data = response.data || response;
        editingRule.value = data;
        form.value = {
          name: data.name || '',
          code: data.code || '',
          description: data.description || '',
          target_model: data.target_model || '',
          permissions: data.permissions || [],
          field_permissions: data.field_permissions || {},
          conditions: data.conditions || [],
          effect: data.effect || 'allow',
          priority: data.priority || 100,
          is_active: data.is_active !== false,
        };
        showDrawer.value = true;
      } catch (e) {
        message.error('Failed to load rule');
        console.error(e);
      }
    };

    const saveRule = async () => {
      if (!form.value.name || !form.value.code || !form.value.target_model) {
        message.error('Name, Code, and Target Model are required');
        return;
      }

      saving.value = true;
      try {
        if (editingRule.value) {
          await updateAccessControlRuleApi(editingRule.value.id, form.value);
          message.success('Rule updated');
        } else {
          await createAccessControlRuleApi(form.value);
          message.success('Rule created');
        }
        showDrawer.value = false;
        await fetchRules();
      } catch (e) {
        message.error('Failed to save rule');
        console.error(e);
      } finally {
        saving.value = false;
      }
    };

    const deleteRule = (rule) => {
      Modal.confirm({
        title: 'Delete Rule',
        content: `Are you sure you want to delete "${rule.name}"?`,
        okText: 'Delete',
        okType: 'danger',
        async onOk() {
          try {
            await deleteAccessControlRuleApi(rule.id);
            message.success('Rule deleted');
            await fetchRules();
          } catch (e) {
            message.error('Failed to delete rule');
            console.error(e);
          }
        },
      });
    };

    const addCondition = () => {
      form.value.conditions.push({
        attribute: '',
        operator: 'eq',
        value: '',
      });
    };

    const removeCondition = (index) => {
      form.value.conditions.splice(index, 1);
    };

    const handleSearch = () => {
      pagination.value.current = 1;
      fetchRules();
    };

    onMounted(() => {
      fetchRules();
    });

    return {
      loading,
      saving,
      rules,
      pagination,
      searchText,
      filterModel,
      showDrawer,
      editingRule,
      form,
      columns,
      permissionOptions,
      effectOptions,
      operatorOptions,
      fetchRules,
      handleTableChange,
      openCreate,
      openEdit,
      saveRule,
      deleteRule,
      addCondition,
      removeCondition,
      handleSearch,
    };
  },
};
</script>

<template>
  <Page auto-content-height>
    <ACard>
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <h2 style="margin: 0;">ACL Rules</h2>
          <p style="color: #666; margin: 4px 0 0 0;">Attribute-Based Access Control rules</p>
        </div>
        <AButton type="primary" @click="openCreate">
          <template #icon><PlusOutlined /></template>
          Create Rule
        </AButton>
      </div>

      <!-- Filters -->
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <AInput
          v-model:value="searchText"
          placeholder="Search rules..."
          style="width: 250px"
          allow-clear
          @press-enter="handleSearch"
        >
          <template #prefix><SearchOutlined /></template>
        </AInput>
        <AInput
          v-model:value="filterModel"
          placeholder="Filter by model..."
          style="width: 180px"
          allow-clear
          @press-enter="handleSearch"
        />
        <AButton @click="fetchRules">
          <template #icon><ReloadOutlined /></template>
        </AButton>
      </div>

      <!-- Table -->
      <ATable
        :columns="columns"
        :data-source="rules"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1000 }"
        row-key="id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'effect'">
            <ATag :color="record.effect === 'allow' ? 'success' : 'error'">
              {{ record.effect }}
            </ATag>
          </template>

          <template v-else-if="column.key === 'permissions'">
            <ATag v-for="p in (record.permissions || []).slice(0, 3)" :key="p" color="blue" style="margin: 2px">
              {{ p }}
            </ATag>
            <ATag v-if="(record.permissions || []).length > 3" color="default">
              +{{ record.permissions.length - 3 }}
            </ATag>
          </template>

          <template v-else-if="column.key === 'status'">
            <ATag :color="record.is_active ? 'success' : 'default'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </ATag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <ASpace>
              <ATooltip title="Edit">
                <AButton type="text" size="small" @click="openEdit(record)">
                  <template #icon><EditOutlined /></template>
                </AButton>
              </ATooltip>
              <ATooltip title="Delete">
                <AButton type="text" size="small" danger @click="deleteRule(record)">
                  <template #icon><DeleteOutlined /></template>
                </AButton>
              </ATooltip>
            </ASpace>
          </template>
        </template>
      </ATable>

      <!-- Empty State -->
      <div v-if="!loading && rules.length === 0" style="text-align: center; padding: 32px;">
        <SafetyOutlined style="font-size: 48px; color: #d9d9d9" />
        <p style="color: #666; margin-top: 16px;">No ACL rules found</p>
        <AButton type="primary" style="margin-top: 16px;" @click="openCreate">
          Create Your First Rule
        </AButton>
      </div>
    </ACard>

    <!-- Edit Drawer -->
    <ADrawer
      v-model:open="showDrawer"
      :title="editingRule ? 'Edit ACL Rule' : 'Create ACL Rule'"
      width="600"
    >
      <AForm layout="vertical">
        <AFormItem label="Name" required>
          <AInput v-model:value="form.name" placeholder="Department Read Access" />
        </AFormItem>

        <AFormItem label="Code" required>
          <AInput v-model:value="form.code" placeholder="dept_read" :disabled="!!editingRule" />
        </AFormItem>

        <AFormItem label="Description">
          <ATextarea v-model:value="form.description" :rows="2" />
        </AFormItem>

        <AFormItem label="Target Model" required>
          <AInput v-model:value="form.target_model" placeholder="employees" />
        </AFormItem>

        <AFormItem label="Permissions">
          <ASelect
            v-model:value="form.permissions"
            mode="multiple"
            placeholder="Select permissions"
            :options="permissionOptions"
          />
        </AFormItem>

        <AFormItem label="Effect">
          <ASelect v-model:value="form.effect" :options="effectOptions" />
        </AFormItem>

        <AFormItem label="Priority">
          <AInputNumber v-model:value="form.priority" :min="0" :max="1000" style="width: 100%" />
        </AFormItem>

        <AFormItem label="Conditions">
          <div v-for="(cond, index) in form.conditions" :key="index" style="display: flex; gap: 8px; margin-bottom: 8px;">
            <AInput v-model:value="cond.attribute" placeholder="attribute" style="width: 35%" />
            <ASelect v-model:value="cond.operator" style="width: 25%" :options="operatorOptions" />
            <AInput v-model:value="cond.value" placeholder="value" style="width: 30%" />
            <AButton type="text" danger @click="removeCondition(index)">
              <template #icon><DeleteOutlined /></template>
            </AButton>
          </div>
          <AButton type="dashed" block @click="addCondition">
            <template #icon><PlusOutlined /></template>
            Add Condition
          </AButton>
        </AFormItem>

        <AFormItem label="Active">
          <ASwitch v-model:checked="form.is_active" />
        </AFormItem>
      </AForm>

      <template #footer>
        <ASpace>
          <AButton @click="showDrawer = false">Cancel</AButton>
          <AButton type="primary" :loading="saving" @click="saveRule">Save</AButton>
        </ASpace>
      </template>
    </ADrawer>
  </Page>
</template>
