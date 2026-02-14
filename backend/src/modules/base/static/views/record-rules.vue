<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { message } from 'ant-design-vue';
import type { ColumnsType } from 'ant-design-vue/es/table';
import { ShieldCheck, Plus, RefreshCw } from 'lucide-vue-next';
import { getRecordRules, createRecordRule, type RecordRule } from '@modules/base/static/api/settings';

defineOptions({ name: 'RecordRulesView' });

const loading = ref(false);
const rules = ref<RecordRule[]>([]);
const showModal = ref(false);
const formLoading = ref(false);

const form = reactive({
  name: '', modelName: '',
  action: 'read' as 'create' | 'read' | 'write' | 'unlink',
  domain: '', groups: '', users: '',
  isActive: true, sequence: 10,
});

const columns: ColumnsType = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Model', dataIndex: 'modelName', key: 'modelName', width: 160 },
  { title: 'Action', key: 'action', width: 100 },
  { title: 'Domain', key: 'domain', width: 200, ellipsis: true },
  { title: 'Groups', key: 'groups', width: 150, ellipsis: true },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 80 },
];

const actionColors: Record<string, string> = {
  create: 'blue', read: 'green', write: 'orange', unlink: 'red',
};

async function loadRules() {
  loading.value = true;
  try {
    const res = await getRecordRules();
    rules.value = Array.isArray(res) ? res : (res as any)?.data || [];
  } catch { rules.value = []; }
  finally { loading.value = false; }
}

function openModal() {
  Object.assign(form, { name: '', modelName: '', action: 'read', domain: '', groups: '', users: '', isActive: true, sequence: 10 });
  showModal.value = true;
}

async function handleSubmit() {
  if (!form.name || !form.modelName) { message.warning('Name and Model are required'); return; }
  formLoading.value = true;
  try {
    let domainObj, groupsObj, usersObj;
    if (form.domain) { try { domainObj = JSON.parse(form.domain); } catch { message.warning('Invalid JSON in Domain'); formLoading.value = false; return; } }
    if (form.groups) { try { groupsObj = JSON.parse(form.groups); } catch { message.warning('Invalid JSON in Groups'); formLoading.value = false; return; } }
    if (form.users) { try { usersObj = JSON.parse(form.users); } catch { message.warning('Invalid JSON in Users'); formLoading.value = false; return; } }
    await createRecordRule({ ...form, domain: domainObj, groups: groupsObj, users: usersObj });
    message.success('Record rule created');
    showModal.value = false;
    await loadRules();
  } catch (e: any) { message.error(e?.message || 'Failed'); }
  finally { formLoading.value = false; }
}

onMounted(() => { loadRules(); });
</script>

<template>
  <div class="record-rules-page p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><ShieldCheck :size="24" /> Record Rules</h1>
        <p class="text-gray-500 m-0">Define record-level security rules for data access</p>
      </div>
      <div class="flex gap-2">
        <a-button @click="loadRules" :loading="loading"><template #icon><RefreshCw :size="14" /></template>Refresh</a-button>
        <a-button type="primary" @click="openModal"><template #icon><Plus :size="14" /></template>Add Rule</a-button>
      </div>
    </div>

    <a-table :columns="columns" :data-source="rules" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <a-tag :color="actionColors[record.action] || 'default'">{{ record.action }}</a-tag>
        </template>
        <template v-else-if="column.key === 'domain'">
          <span v-if="record.domain" class="text-xs text-gray-500">{{ JSON.stringify(record.domain).slice(0, 50) }}</span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template v-else-if="column.key === 'groups'">
          <span v-if="record.groups" class="text-xs text-gray-500">{{ JSON.stringify(record.groups).slice(0, 40) }}</span>
          <span v-else class="text-gray-300">-</span>
        </template>
        <template v-else-if="column.key === 'active'">
          <a-tag :color="record.isActive ? 'green' : 'default'">{{ record.isActive ? 'Yes' : 'No' }}</a-tag>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="showModal" title="Create Record Rule" @ok="handleSubmit" :confirm-loading="formLoading">
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12"><a-form-item label="Name"><a-input v-model:value="form.name" placeholder="Rule name" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Model Name"><a-input v-model:value="form.modelName" placeholder="e.g. Donation" /></a-form-item></a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Action">
              <a-select v-model:value="form.action" style="width:100%">
                <a-select-option value="create">Create</a-select-option>
                <a-select-option value="read">Read</a-select-option>
                <a-select-option value="write">Write</a-select-option>
                <a-select-option value="unlink">Unlink (Delete)</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12"><a-form-item label="Sequence"><a-input-number v-model:value="form.sequence" :min="0" style="width:100%" /></a-form-item></a-col>
        </a-row>
        <a-form-item label="Domain Filter (JSON)"><a-textarea v-model:value="form.domain" :rows="2" placeholder='e.g. { "status": "active" }' /></a-form-item>
        <a-form-item label="Groups (JSON)"><a-textarea v-model:value="form.groups" :rows="2" placeholder='e.g. ["admin", "manager"]' /></a-form-item>
        <a-form-item label="Users (JSON)"><a-textarea v-model:value="form.users" :rows="2" placeholder='e.g. [1, 2, 3]' /></a-form-item>
        <a-form-item label="Active"><a-switch v-model:checked="form.isActive" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.record-rules-page { min-height: 100%; }
</style>
