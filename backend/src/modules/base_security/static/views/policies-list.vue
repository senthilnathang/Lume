<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import {
  message,
  Modal,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  CopyOutlined,
  ReloadOutlined,
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue';
import {
  getPoliciesApi,
  deletePolicyApi,
  activatePolicyApi,
  deactivatePolicyApi,
  clonePolicyApi,
} from '#/api/base_security';

export default {
  name: 'PoliciesList',
  components: {
    Page,
    AButton: Button,
    ACard: Card,
    AInput: Input,
    ASelect: Select,
    ASpace: Space,
    ATable: Table,
    ATag: Tag,
    ATooltip: Tooltip,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    PlayCircleOutlined,
    PauseCircleOutlined,
    CopyOutlined,
    ReloadOutlined,
    SearchOutlined,
    LockOutlined,
    UnlockOutlined,
  },
  setup() {
    const router = useRouter();

    // Define constants locally
    const POLICY_EFFECTS = [
      { value: 'allow', label: 'Allow', color: 'success' },
      { value: 'deny', label: 'Deny', color: 'error' },
    ];

    const POLICY_SCOPES = [
      { value: 'global', label: 'Global' },
      { value: 'model', label: 'Model' },
      { value: 'field', label: 'Field' },
      { value: 'action', label: 'Action' },
      { value: 'record', label: 'Record' },
    ];

    const effectOptions = POLICY_EFFECTS.map(e => ({ value: e.value, label: e.label }));

    const loading = ref(false);
    const policies = ref([]);
    const pagination = ref({
      current: 1,
      pageSize: 20,
      total: 0,
    });

    // Filters
    const filterEffect = ref('');
    const filterScope = ref('');
    const searchText = ref('');

    const columns = [
      { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
      { title: 'Code', dataIndex: 'code', key: 'code', width: 150 },
      { title: 'Effect', key: 'effect', width: 100 },
      { title: 'Scope', key: 'scope', width: 120 },
      { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 80, align: 'center' },
      { title: 'Status', key: 'status', width: 100 },
      { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
    ];

    const getEffectColor = (effect) => {
      return effect === 'allow' ? 'success' : 'error';
    };

    const getScopeLabel = (scope) => {
      const found = POLICY_SCOPES.find(s => s.value === scope);
      return found ? found.label : scope;
    };

    const fetchPolicies = async () => {
      loading.value = true;
      try {
        const params = {
          page: pagination.value.current,
          page_size: pagination.value.pageSize,
        };
        if (filterEffect.value) params.effect = filterEffect.value;
        if (filterScope.value) params.scope = filterScope.value;
        if (searchText.value) params.search = searchText.value;

        const response = await getPoliciesApi(params);
        policies.value = response.items || [];
        pagination.value.total = response.total || 0;
      } catch (e) {
        message.error('Failed to load policies');
        console.error(e);
      } finally {
        loading.value = false;
      }
    };

    const handleTableChange = (pag) => {
      pagination.value.current = pag.current;
      pagination.value.pageSize = pag.pageSize;
      fetchPolicies();
    };

    const createPolicy = () => {
      router.push('/base_security/policy-builder');
    };

    const editPolicy = (policy) => {
      router.push(`/base_security/policy-builder?id=${policy.id}`);
    };

    const togglePolicy = async (policy) => {
      try {
        if (policy.is_active) {
          await deactivatePolicyApi(policy.id);
          message.success('Policy deactivated');
        } else {
          await activatePolicyApi(policy.id);
          message.success('Policy activated');
        }
        await fetchPolicies();
      } catch (e) {
        message.error('Failed to update policy status');
        console.error(e);
      }
    };

    const clonePolicy = async (policy) => {
      try {
        await clonePolicyApi(policy.id);
        message.success('Policy cloned successfully');
        await fetchPolicies();
      } catch (e) {
        message.error('Failed to clone policy');
        console.error(e);
      }
    };

    const deletePolicy = (policy) => {
      Modal.confirm({
        title: 'Delete Policy',
        content: `Are you sure you want to delete "${policy.name}"? This cannot be undone.`,
        okText: 'Delete',
        okType: 'danger',
        cancelText: 'Cancel',
        async onOk() {
          try {
            await deletePolicyApi(policy.id);
            message.success('Policy deleted');
            await fetchPolicies();
          } catch (e) {
            message.error('Failed to delete policy');
            console.error(e);
          }
        },
      });
    };

    const handleSearch = () => {
      pagination.value.current = 1;
      fetchPolicies();
    };

    onMounted(() => {
      fetchPolicies();
    });

    return {
      loading,
      policies,
      pagination,
      filterEffect,
      filterScope,
      searchText,
      columns,
      effectOptions,
      POLICY_SCOPES,
      getEffectColor,
      getScopeLabel,
      fetchPolicies,
      handleTableChange,
      createPolicy,
      editPolicy,
      togglePolicy,
      clonePolicy,
      deletePolicy,
      handleSearch,
    };
  },
};
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Security Policies</h1>
          <p class="text-gray-500">OPA-style declarative access control policies</p>
        </div>
        <AButton type="primary" @click="createPolicy">
          <template #icon><PlusOutlined /></template>
          Create Policy
        </AButton>
      </div>

      <ACard>
        <!-- Filters -->
        <div class="mb-4 flex flex-wrap gap-3">
          <AInput
            v-model:value="searchText"
            placeholder="Search policies..."
            style="width: 250px"
            allow-clear
            @press-enter="handleSearch"
          >
            <template #prefix><SearchOutlined /></template>
          </AInput>
          <ASelect
            v-model:value="filterEffect"
            placeholder="Effect"
            style="width: 120px"
            allow-clear
            :options="effectOptions"
            @change="handleSearch"
          />
          <ASelect
            v-model:value="filterScope"
            placeholder="Scope"
            style="width: 140px"
            allow-clear
            :options="POLICY_SCOPES"
            @change="handleSearch"
          />
          <AButton @click="fetchPolicies">
            <template #icon><ReloadOutlined /></template>
          </AButton>
        </div>

        <!-- Table -->
        <ATable
          :columns="columns"
          :data-source="policies"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'effect'">
              <ATag :color="getEffectColor(record.effect)">
                <template v-if="record.effect === 'allow'">
                  <UnlockOutlined /> Allow
                </template>
                <template v-else>
                  <LockOutlined /> Deny
                </template>
              </ATag>
            </template>

            <template v-else-if="column.key === 'scope'">
              <ATag>{{ getScopeLabel(record.scope) }}</ATag>
            </template>

            <template v-else-if="column.key === 'status'">
              <ATag :color="record.is_active ? 'success' : 'default'">
                {{ record.is_active ? 'Active' : 'Inactive' }}
              </ATag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <ASpace>
                <ATooltip title="Edit">
                  <AButton type="text" size="small" @click="editPolicy(record)">
                    <template #icon><EditOutlined /></template>
                  </AButton>
                </ATooltip>
                <ATooltip :title="record.is_active ? 'Deactivate' : 'Activate'">
                  <AButton type="text" size="small" @click="togglePolicy(record)">
                    <template #icon>
                      <PauseCircleOutlined v-if="record.is_active" />
                      <PlayCircleOutlined v-else />
                    </template>
                  </AButton>
                </ATooltip>
                <ATooltip title="Clone">
                  <AButton type="text" size="small" @click="clonePolicy(record)">
                    <template #icon><CopyOutlined /></template>
                  </AButton>
                </ATooltip>
                <ATooltip title="Delete">
                  <AButton type="text" size="small" danger @click="deletePolicy(record)">
                    <template #icon><DeleteOutlined /></template>
                  </AButton>
                </ATooltip>
              </ASpace>
            </template>
          </template>
        </ATable>

        <!-- Empty State -->
        <div v-if="!loading && policies.length === 0" class="py-8 text-center">
          <LockOutlined style="font-size: 48px; color: #d9d9d9" />
          <p class="mt-4 text-gray-500">No policies found</p>
          <AButton type="primary" class="mt-4" @click="createPolicy">
            Create Your First Policy
          </AButton>
        </div>
      </ACard>
    </div>
  </Page>
</template>
