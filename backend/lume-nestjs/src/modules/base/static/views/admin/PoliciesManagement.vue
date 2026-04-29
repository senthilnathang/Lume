<template>
  <div class="policies-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Policies</h2>
      <a-button type="primary" @click="showCreateDrawer = true">Create Policy</a-button>
    </div>

    <!-- Policies Table -->
    <a-table :columns="columns" :data-source="policies" :loading="loading" :pagination="false" :scroll="{ x: 1200 }" />

    <!-- Create Policy Drawer -->
    <a-drawer
      v-model:open="showCreateDrawer"
      title="Create Policy"
      placement="right"
      :width="600"
      @close="showCreateDrawer = false"
    >
      <a-form layout="vertical" :model="policyForm">
        <a-form-item label="Policy Name" required>
          <a-input v-model:value="policyForm.name" placeholder="e.g., lead-owner-only" />
        </a-form-item>

        <a-form-item label="Entity" required>
          <a-input v-model:value="policyForm.entity" placeholder="e.g., Lead" />
        </a-form-item>

        <a-form-item label="Actions" required>
          <a-select v-model:value="policyForm.actions" mode="multiple" placeholder="Select actions">
            <a-select-option value="read">Read</a-select-option>
            <a-select-option value="write">Write</a-select-option>
            <a-select-option value="delete">Delete</a-select-option>
            <a-select-option value="create">Create</a-select-option>
            <a-select-option value="*">All (*)</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Roles">
          <a-select v-model:value="policyForm.roles" mode="multiple" placeholder="Select roles (optional)">
            <a-select-option value="admin">Admin</a-select-option>
            <a-select-option value="user">User</a-select-option>
            <a-select-option value="guest">Guest</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Deny Policy?">
          <a-checkbox v-model:checked="policyForm.deny">Check to make this a deny policy</a-checkbox>
        </a-form-item>

        <div class="flex gap-2 justify-end">
          <a-button @click="showCreateDrawer = false">Cancel</a-button>
          <a-button type="primary" @click="createPolicy" :loading="creating">Create</a-button>
        </div>
      </a-form>
    </a-drawer>

    <!-- Policy Detail Drawer -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="Policy Details"
      placement="right"
      :width="600"
      @close="showDetailDrawer = false"
    >
      <div v-if="selectedPolicy" class="space-y-4">
        <div>
          <label class="font-bold">Name</label>
          <p>{{ selectedPolicy.name }}</p>
        </div>
        <div>
          <label class="font-bold">Entity</label>
          <p>{{ selectedPolicy.entity }}</p>
        </div>
        <div>
          <label class="font-bold">Actions</label>
          <div class="flex gap-2 flex-wrap">
            <a-tag v-for="action in selectedPolicy.actions" :key="action">{{ action }}</a-tag>
          </div>
        </div>
        <div>
          <label class="font-bold">Roles</label>
          <div class="flex gap-2 flex-wrap">
            <a-tag v-for="role in selectedPolicy.roles" :key="role" color="blue">{{ role }}</a-tag>
            <span v-if="!selectedPolicy.roles?.length" class="text-gray-500">None (applies to all roles)</span>
          </div>
        </div>
        <div v-if="selectedPolicy.conditions?.length">
          <label class="font-bold">Conditions</label>
          <ul class="space-y-2">
            <li v-for="(cond, idx) in selectedPolicy.conditions" :key="idx" class="bg-gray-50 p-2 rounded">
              <span class="font-mono text-sm">{{ cond.field }} {{ cond.operator }} {{ cond.value }}</span>
            </li>
          </ul>
        </div>
        <div>
          <label class="font-bold">Policy Type</label>
          <a-tag :color="selectedPolicy.deny ? 'red' : 'green'">
            {{ selectedPolicy.deny ? 'DENY' : 'ALLOW' }}
          </a-tag>
        </div>

        <div class="flex gap-2 justify-end border-t pt-4">
          <a-button @click="testPolicy">Test Policy</a-button>
          <a-popconfirm title="Confirm delete?" ok-text="Yes" cancel-text="No" @confirm="deletePolicy(selectedPolicy.name)">
            <a-button danger>Delete</a-button>
          </a-popconfirm>
        </div>
      </div>
    </a-drawer>

    <!-- Test Policy Modal -->
    <a-modal v-model:open="showTestModal" title="Test Policy" ok-text="Evaluate" @ok="runTest" :loading="testing">
      <a-form layout="vertical" :model="testForm">
        <a-form-item label="User ID" required>
          <a-input-number v-model:value="testForm.userId" />
        </a-form-item>
        <a-form-item label="Role ID" required>
          <a-input-number v-model:value="testForm.roleId" />
        </a-form-item>
        <a-form-item label="Company ID">
          <a-input-number v-model:value="testForm.companyId" />
        </a-form-item>
        <a-form-item label="Action">
          <a-select v-model:value="testForm.action">
            <a-select-option value="read">Read</a-select-option>
            <a-select-option value="write">Write</a-select-option>
            <a-select-option value="delete">Delete</a-select-option>
            <a-select-option value="create">Create</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { get, post, put, del } from '@/api/request';

interface Policy {
  name: string;
  entity: string;
  actions: string[];
  conditions?: Array<{ field: string; operator: string; value: string }>;
  roles?: string[];
  deny: boolean;
}

const policies = ref<Policy[]>([]);
const loading = ref(false);
const showCreateDrawer = ref(false);
const showDetailDrawer = ref(false);
const showTestModal = ref(false);
const selectedPolicy = ref<Policy | null>(null);
const creating = ref(false);
const testing = ref(false);

const policyForm = ref({
  name: '',
  entity: '',
  actions: [] as string[],
  roles: [] as string[],
  deny: false,
});

const testForm = ref({
  userId: 1,
  roleId: 1,
  companyId: undefined as number | undefined,
  action: 'read',
});

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Entity', dataIndex: 'entity', key: 'entity', width: 120 },
  {
    title: 'Actions',
    key: 'actions',
    width: 180,
    slots: { customRender: 'actions' },
  },
  {
    title: 'Type',
    dataIndex: 'deny',
    key: 'deny',
    width: 80,
    slots: { customRender: 'type' },
  },
];

const loadPolicies = async () => {
  loading.value = true;
  try {
    const data = await get('/api/admin/policies');
    policies.value = data;
  } catch (error) {
    message.error('Failed to load policies');
  } finally {
    loading.value = false;
  }
};

const createPolicy = async () => {
  if (!policyForm.value.name || !policyForm.value.entity || policyForm.value.actions.length === 0) {
    message.error('Please fill in required fields');
    return;
  }

  creating.value = true;
  try {
    await post('/api/admin/policies', policyForm.value);
    message.success('Policy created successfully');
    showCreateDrawer.value = false;
    policyForm.value = { name: '', entity: '', actions: [], roles: [], deny: false };
    await loadPolicies();
  } catch (error) {
    message.error('Failed to create policy');
  } finally {
    creating.value = false;
  }
};

const viewDetails = (policy: Policy) => {
  selectedPolicy.value = policy;
  showDetailDrawer.value = true;
};

const testPolicy = () => {
  showTestModal.value = true;
};

const runTest = async () => {
  if (!selectedPolicy.value) return;

  testing.value = true;
  try {
    await post('/api/admin/policies/test', {
      policyName: selectedPolicy.value.name,
      userId: testForm.value.userId,
      roleId: testForm.value.roleId,
      companyId: testForm.value.companyId,
      action: testForm.value.action,
    });
    message.success('Policy evaluation completed');
    showTestModal.value = false;
  } catch (error) {
    message.error('Failed to evaluate policy');
  } finally {
    testing.value = false;
  }
};

const deletePolicy = async (policyName: string) => {
  try {
    await del(`/api/admin/policies/${policyName}`);
    message.success('Policy deleted successfully');
    showDetailDrawer.value = false;
    await loadPolicies();
  } catch (error) {
    message.error('Failed to delete policy');
  }
};

onMounted(() => {
  loadPolicies();
});
</script>

<style scoped>
.policies-management {
  /* scoped styles */
}
</style>
