<template>
  <div class="workflows-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Workflows</h2>
      <a-button type="primary" @click="showCreateDrawer = true">Create Workflow</a-button>
    </div>

    <!-- Workflows Table -->
    <a-table :columns="columns" :data-source="workflows" :loading="loading" :pagination="false" :scroll="{ x: 1000 }" />

    <!-- Create Workflow Drawer -->
    <a-drawer
      v-model:open="showCreateDrawer"
      title="Create Workflow"
      placement="right"
      :width="500"
      @close="showCreateDrawer = false"
    >
      <a-form layout="vertical" :model="workflowForm">
        <a-form-item label="Workflow Name" required>
          <a-input v-model:value="workflowForm.name" placeholder="e.g., lead-assignment" />
        </a-form-item>

        <a-form-item label="Entity" required>
          <a-input v-model:value="workflowForm.entity" placeholder="e.g., Lead" />
        </a-form-item>

        <a-form-item label="Trigger Type" required>
          <a-select v-model:value="workflowForm.trigger">
            <a-select-option value="create">On Record Created</a-select-option>
            <a-select-option value="update">On Record Updated</a-select-option>
            <a-select-option value="delete">On Record Deleted</a-select-option>
            <a-select-option value="schedule">On Schedule (Cron)</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Description">
          <a-textarea v-model:value="workflowForm.description" rows="3" />
        </a-form-item>

        <div class="flex gap-2 justify-end">
          <a-button @click="showCreateDrawer = false">Cancel</a-button>
          <a-button type="primary" @click="createWorkflow" :loading="creating">Create</a-button>
        </div>
      </a-form>
    </a-drawer>

    <!-- Workflow Detail Drawer -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="Workflow Details"
      placement="right"
      :width="600"
      @close="showDetailDrawer = false"
    >
      <div v-if="selectedWorkflow" class="space-y-4">
        <div>
          <label class="font-bold">Name</label>
          <p>{{ selectedWorkflow.name }}</p>
        </div>
        <div>
          <label class="font-bold">Version</label>
          <p>{{ selectedWorkflow.version }}</p>
        </div>
        <div>
          <label class="font-bold">Entity</label>
          <p>{{ selectedWorkflow.entity }}</p>
        </div>
        <div>
          <label class="font-bold">Trigger</label>
          <p>{{ JSON.stringify(selectedWorkflow.trigger) }}</p>
        </div>
        <div>
          <label class="font-bold">Steps</label>
          <p>{{ selectedWorkflow.steps }} step(s)</p>
        </div>
        <div>
          <label class="font-bold">Error Handling</label>
          <p>{{ selectedWorkflow.onError }}</p>
        </div>
        <div>
          <label class="font-bold">Max Retries</label>
          <p>{{ selectedWorkflow.maxRetries }}</p>
        </div>

        <div class="flex gap-2 justify-end border-t pt-4">
          <a-button @click="testWorkflow" :loading="testing">Test</a-button>
          <a-button type="primary" @click="executeWorkflow" :loading="executing">Execute</a-button>
          <a-button @click="viewRuns">View Runs</a-button>
        </div>
      </div>
    </a-drawer>

    <!-- Test Workflow Modal -->
    <a-modal v-model:open="showTestModal" title="Test Workflow" ok-text="Test" @ok="runTest" :loading="testing">
      <a-form layout="vertical" :model="testForm">
        <a-form-item label="Sample Data (JSON)">
          <a-textarea v-model:value="testForm.sampleData" rows="6" placeholder="{}" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { get, post } from '@/api/request';

interface Workflow {
  name: string;
  version: string;
  entity: string;
  trigger: Record<string, any>;
  steps: number;
  onError: string;
  maxRetries: number;
}

const workflows = ref<Workflow[]>([]);
const loading = ref(false);
const showCreateDrawer = ref(false);
const showDetailDrawer = ref(false);
const showTestModal = ref(false);
const selectedWorkflow = ref<Workflow | null>(null);
const creating = ref(false);
const testing = ref(false);
const executing = ref(false);

const workflowForm = ref({
  name: '',
  entity: '',
  trigger: 'create',
  description: '',
});

const testForm = ref({
  sampleData: '{}',
});

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Entity', dataIndex: 'entity', key: 'entity', width: 120 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 100 },
  { title: 'Trigger', dataIndex: 'trigger', key: 'trigger', width: 120 },
  { title: 'Steps', dataIndex: 'steps', key: 'steps', width: 80 },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    align: 'center',
  },
];

const loadWorkflows = async () => {
  loading.value = true;
  try {
    const data = await get('/api/admin/workflows');
    workflows.value = data;
  } catch (error) {
    message.error('Failed to load workflows');
  } finally {
    loading.value = false;
  }
};

const createWorkflow = async () => {
  if (!workflowForm.value.name || !workflowForm.value.entity) {
    message.error('Please fill in required fields');
    return;
  }

  creating.value = true;
  try {
    await post('/api/admin/workflows', workflowForm.value);
    message.success('Workflow created successfully');
    showCreateDrawer.value = false;
    workflowForm.value = { name: '', entity: '', trigger: 'create', description: '' };
    await loadWorkflows();
  } catch (error) {
    message.error('Failed to create workflow');
  } finally {
    creating.value = false;
  }
};

const viewDetails = (workflow: Workflow) => {
  selectedWorkflow.value = workflow;
  showDetailDrawer.value = true;
};

const testWorkflow = () => {
  showTestModal.value = true;
};

const runTest = async () => {
  if (!selectedWorkflow.value) return;

  testing.value = true;
  try {
    const sampleData = JSON.parse(testForm.value.sampleData);
    await post(`/api/admin/workflows/test/${selectedWorkflow.value.name}`, { sampleData });
    message.success('Workflow test completed');
    showTestModal.value = false;
  } catch (error) {
    message.error('Failed to test workflow');
  } finally {
    testing.value = false;
  }
};

const executeWorkflow = async () => {
  if (!selectedWorkflow.value) return;

  executing.value = true;
  try {
    await post(`/api/admin/workflows/${selectedWorkflow.value.name}/execute`, { recordId: 1 });
    message.success('Workflow executed successfully');
  } catch (error) {
    message.error('Failed to execute workflow');
  } finally {
    executing.value = false;
  }
};

const viewRuns = () => {
  message.info('Workflow runs history coming soon');
};

onMounted(() => {
  loadWorkflows();
});
</script>

<style scoped>
.workflows-management {
  /* scoped styles */
}
</style>
