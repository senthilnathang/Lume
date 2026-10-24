<template>
  <div class="page">
    <div class="header">
      <h1>Record Rules</h1>
      <a-button type="primary" @click="open()">Create Rule</a-button>
    </div>
    <a-spin :spinning="loading">
      <a-table :columns="columns" :data-source="data" :pagination="false" row-key="id" size="small">
        <template #bodyCell="{ column, record }">
          <a-tag v-if="column.key === 'active'">{{ record.isActive ? 'Active' : 'Inactive' }}</a-tag>
          <a-space v-if="column.key === 'actions'">
            <a-button type="link" size="small" @click="open(record)">Edit</a-button>
            <a-popconfirm v-if="record.isActive" title="Deactivate this rule?" @confirm="deactivate(record.id)">
              <a-button type="link" size="small" danger>Deactivate</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </a-table>
    </a-spin>
    <a-space style="margin-top:16px">
      <a-button :disabled="page === 1 || loading" @click="changePage(-1)">Previous</a-button>
      <span>Page {{ page }}</span>
      <a-button :disabled="data.length < 50 || loading" @click="changePage(1)">Next</a-button>
    </a-space>
    <a-modal v-model:open="visible" :title="editingId ? 'Edit Record Rule' : 'Create Record Rule'" :confirm-loading="saving" @ok="save">
      <a-form layout="vertical">
        <a-form-item label="Name" required><a-input v-model:value="form.name" /></a-form-item>
        <a-form-item label="Model" required><a-input v-model:value="form.modelName" :disabled="editingId !== null" placeholder="EntityRecord" /></a-form-item>
        <a-form-item label="Action" required><a-select v-model:value="form.action" :options="actions" /></a-form-item>
        <a-form-item label="Domain (JSON object)" required><a-textarea v-model:value="form.domain" :rows="4" /></a-form-item>
        <a-form-item label="Role IDs (JSON array)"><a-input v-model:value="form.groups" placeholder="[] applies to all roles" /></a-form-item>
        <a-form-item label="User IDs (JSON array)"><a-input v-model:value="form.users" placeholder="[] applies to all users" /></a-form-item>
        <a-form-item label="Sequence"><a-input-number v-model:value="form.sequence" :min="0" /></a-form-item>
        <a-form-item v-if="editingId !== null" label="Active"><a-switch v-model:checked="form.isActive" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { getRecordRules, createRecordRule, updateRecordRule, deactivateRecordRule, type RecordRule } from '@modules/base/static/api/settings'
const loading = ref(false)
const data = ref<RecordRule[]>([])
const page = ref(1)
const visible = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)
const defaults = () => ({ name: '', modelName: '', action: 'read' as RecordRule['action'], domain: '{}', groups: '[]', users: '[]', sequence: 10, isActive: true })
const form = reactive(defaults())
const actions = ['create', 'read', 'write', 'unlink'].map(value => ({ value, label: value }))
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Model', dataIndex: 'modelName', key: 'model' },
  { title: 'Action', dataIndex: 'action' },
  { title: 'Status', key: 'active' },
  { title: 'Actions', key: 'actions', width: 180 }
]
const fetch = async () => {
  loading.value = true
  try {
    data.value = await getRecordRules({ page: page.value, limit: 50 })
  } catch (err) {
    message.error('Failed to load')
  } finally {
    loading.value = false
  }
}
onMounted(() => fetch())
const asJson = (value: unknown, fallback: string) => value == null ? fallback : typeof value === 'string' ? value : JSON.stringify(value)
function open(rule?: RecordRule) {
  editingId.value = rule?.id ?? null
  Object.assign(form, defaults(), rule || {}, { domain: asJson(rule?.domain, '{}'), groups: asJson(rule?.groups, '[]'), users: asJson(rule?.users, '[]') })
  visible.value = true
}
async function save() {
  if (!form.name.trim() || !form.modelName.trim()) { message.warning('Name and model are required'); return }
  try {
    const domain = JSON.parse(form.domain)
    if (!domain || Array.isArray(domain) || typeof domain !== 'object') throw new Error()
    for (const value of [form.groups, form.users]) {
      const ids = JSON.parse(value || '[]')
      if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1)) throw new Error()
    }
  } catch { message.error('Enter a JSON object for the domain and arrays of positive IDs for roles and users'); return }
  saving.value = true
  try {
    const payload = { ...form, groups: form.groups || '[]', users: form.users || '[]' }
    if (editingId.value !== null) await updateRecordRule(editingId.value, payload)
    else await createRecordRule(payload)
    visible.value = false
    message.success('Record rule saved')
    await fetch()
  } catch (error: any) { message.error(error.message || 'Failed to save record rule') }
  finally { saving.value = false }
}
async function deactivate(id: number) {
  try { await deactivateRecordRule(id); message.success('Record rule deactivated'); await fetch() }
  catch (error: any) { message.error(error.message || 'Failed to deactivate rule') }
}
function changePage(delta: number) { page.value += delta; fetch() }
</script>
<style scoped>
.page { padding: 24px; }
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.header h1 { margin: 0; }
</style>
