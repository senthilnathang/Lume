<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import {
  FileInput, Plus, Edit3, Trash2, Eye, Mail, Search,
  GripVertical, ChevronDown, ChevronUp, Settings, Inbox
} from 'lucide-vue-next';
import { getForms, getForm, createForm, updateForm, deleteForm, getSubmissions, markSubmissionRead, deleteSubmission } from '../api/index';

defineOptions({ name: 'WebsiteForms' });

const route = useRoute();
const loading = ref(false);
const forms = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const searchQuery = ref('');

// Form editor
const editorVisible = ref(false);
const editorLoading = ref(false);
const editingForm = reactive({
  id: null as number | null,
  name: '',
  fields: [] as any[],
  settings: {
    emailTo: '',
    emailSubject: '',
    successMessage: 'Thank you! Your submission has been received.',
    redirectUrl: '',
  },
  isActive: true,
});

// Submissions viewer
const subsVisible = ref(false);
const subsLoading = ref(false);
const submissions = ref<any[]>([]);
const subsTotal = ref(0);
const subsPage = ref(1);
const viewingFormId = ref<number | null>(null);
const viewingFormName = ref('');

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL' },
  { value: 'hidden', label: 'Hidden' },
];

async function loadForms() {
  loading.value = true;
  try {
    const result = await getForms({
      page: page.value,
      limit: 20,
      search: searchQuery.value || undefined,
    });
    forms.value = result.data || result || [];
    total.value = result.pagination?.total || 0;
  } catch {
    message.error('Failed to load forms');
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  Object.assign(editingForm, {
    id: null,
    name: '',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true, placeholder: 'Your name' },
      { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'your@email.com' },
      { name: 'message', type: 'textarea', label: 'Message', required: true, placeholder: 'Your message...' },
    ],
    settings: {
      emailTo: '',
      emailSubject: '',
      successMessage: 'Thank you! Your submission has been received.',
      redirectUrl: '',
    },
    isActive: true,
  });
  editorVisible.value = true;
}

async function openEdit(id: number) {
  editorLoading.value = true;
  editorVisible.value = true;
  try {
    const data = await getForm(id);
    const d = data.data || data;
    editingForm.id = d.id;
    editingForm.name = d.name;
    editingForm.isActive = d.isActive;
    editingForm.fields = typeof d.fields === 'string' ? JSON.parse(d.fields || '[]') : (d.fields || []);
    editingForm.settings = typeof d.settings === 'string' ? JSON.parse(d.settings || '{}') : (d.settings || {});
  } catch {
    message.error('Failed to load form');
    editorVisible.value = false;
  } finally {
    editorLoading.value = false;
  }
}

async function saveForm() {
  if (!editingForm.name.trim()) {
    message.warning('Form name is required');
    return;
  }
  editorLoading.value = true;
  try {
    const payload = {
      name: editingForm.name,
      fields: editingForm.fields,
      settings: editingForm.settings,
      isActive: editingForm.isActive,
    };
    if (editingForm.id) {
      await updateForm(editingForm.id, payload);
      message.success('Form updated');
    } else {
      await createForm(payload);
      message.success('Form created');
    }
    editorVisible.value = false;
    loadForms();
  } catch (err: any) {
    message.error(err?.message || 'Failed to save form');
  } finally {
    editorLoading.value = false;
  }
}

async function handleDelete(id: number) {
  Modal.confirm({
    title: 'Delete Form',
    content: 'This will also delete all submissions. Are you sure?',
    okType: 'danger',
    async onOk() {
      try {
        await deleteForm(id);
        message.success('Form deleted');
        loadForms();
      } catch {
        message.error('Failed to delete form');
      }
    },
  });
}

function addField() {
  editingForm.fields.push({
    name: `field_${editingForm.fields.length + 1}`,
    type: 'text',
    label: '',
    required: false,
    placeholder: '',
    options: '',
  });
}

function removeField(index: number) {
  editingForm.fields.splice(index, 1);
}

function moveField(index: number, direction: number) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= editingForm.fields.length) return;
  const temp = editingForm.fields[index];
  editingForm.fields[index] = editingForm.fields[newIndex];
  editingForm.fields[newIndex] = temp;
}

// Submissions
async function openSubmissions(form: any) {
  viewingFormId.value = form.id;
  viewingFormName.value = form.name;
  subsVisible.value = true;
  subsPage.value = 1;
  await loadSubmissions();
}

async function loadSubmissions() {
  if (!viewingFormId.value) return;
  subsLoading.value = true;
  try {
    const result = await getSubmissions(viewingFormId.value, {
      page: subsPage.value,
      limit: 20,
    });
    submissions.value = (result.data || result || []).map((s: any) => ({
      ...s,
      parsedData: typeof s.data === 'string' ? JSON.parse(s.data || '{}') : (s.data || {}),
    }));
    subsTotal.value = result.pagination?.total || 0;
  } catch {
    message.error('Failed to load submissions');
  } finally {
    subsLoading.value = false;
  }
}

async function handleMarkRead(sub: any) {
  if (!viewingFormId.value) return;
  try {
    await markSubmissionRead(viewingFormId.value, sub.id);
    sub.isRead = true;
  } catch {
    message.error('Failed to mark as read');
  }
}

async function handleDeleteSubmission(subId: number) {
  if (!viewingFormId.value) return;
  try {
    await deleteSubmission(viewingFormId.value, subId);
    message.success('Submission deleted');
    loadSubmissions();
  } catch {
    message.error('Failed to delete submission');
  }
}

function formatDate(d: string) {
  return d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
}

onMounted(loadForms);

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Status', dataIndex: 'isActive', key: 'status', width: 100 },
  { title: 'Submissions', dataIndex: 'submissionCount', key: 'submissions', width: 120 },
  { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 160 },
  { title: 'Actions', key: 'actions', width: 160 },
];
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <FileInput :size="20" class="text-blue-600" />
        </div>
        <div>
          <h2 class="text-lg font-semibold text-gray-800 m-0">Forms</h2>
          <p class="text-sm text-gray-500 m-0">Build and manage contact forms</p>
        </div>
      </div>
      <a-button type="primary" @click="openCreate">
        <template #icon><Plus :size="16" /></template>
        New Form
      </a-button>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <a-input
        v-model:value="searchQuery"
        placeholder="Search forms..."
        allow-clear
        style="width: 300px;"
        @pressEnter="loadForms"
        @change="loadForms"
      >
        <template #prefix><Search :size="14" class="text-gray-400" /></template>
      </a-input>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="forms"
      :loading="loading"
      :pagination="{ current: page, total, pageSize: 20 }"
      row-key="id"
      @change="(p: any) => { page = p.current; loadForms(); }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="font-medium">{{ record.name }}</div>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.isActive ? 'green' : 'default'">
            {{ record.isActive ? 'Active' : 'Inactive' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'submissions'">
          <a-button type="link" size="small" @click="openSubmissions(record)">
            <Inbox :size="14" class="mr-1" />
            {{ record.submissionCount || 0 }}
          </a-button>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          <span class="text-sm text-gray-500">{{ formatDate(record.createdAt) }}</span>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-1">
            <a-button type="text" size="small" @click="openEdit(record.id)">
              <template #icon><Edit3 :size="14" /></template>
            </a-button>
            <a-button type="text" size="small" @click="openSubmissions(record)">
              <template #icon><Inbox :size="14" /></template>
            </a-button>
            <a-button type="text" size="small" danger @click="handleDelete(record.id)">
              <template #icon><Trash2 :size="14" /></template>
            </a-button>
          </div>
        </template>
      </template>
    </a-table>

    <!-- Form Editor Drawer -->
    <a-drawer
      :open="editorVisible"
      :title="editingForm.id ? 'Edit Form' : 'New Form'"
      :width="640"
      @close="editorVisible = false"
    >
      <a-spin :spinning="editorLoading">
        <a-form layout="vertical">
          <a-form-item label="Form Name" required>
            <a-input v-model:value="editingForm.name" placeholder="Contact Form" />
          </a-form-item>

          <a-form-item>
            <a-switch v-model:checked="editingForm.isActive" /> <span class="ml-2 text-sm">Active</span>
          </a-form-item>

          <a-divider>Fields</a-divider>

          <div class="space-y-3 mb-4">
            <div
              v-for="(field, idx) in editingForm.fields"
              :key="idx"
              class="border rounded-lg p-3 bg-gray-50"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-400 font-mono">#{{ idx + 1 }}</span>
                  <span class="text-sm font-medium">{{ field.label || field.name }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <a-button type="text" size="small" :disabled="idx === 0" @click="moveField(idx, -1)">
                    <template #icon><ChevronUp :size="14" /></template>
                  </a-button>
                  <a-button type="text" size="small" :disabled="idx === editingForm.fields.length - 1" @click="moveField(idx, 1)">
                    <template #icon><ChevronDown :size="14" /></template>
                  </a-button>
                  <a-button type="text" size="small" danger @click="removeField(idx)">
                    <template #icon><Trash2 :size="14" /></template>
                  </a-button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-gray-500">Label</label>
                  <a-input v-model:value="field.label" size="small" placeholder="Field Label" />
                </div>
                <div>
                  <label class="text-xs text-gray-500">Name</label>
                  <a-input v-model:value="field.name" size="small" placeholder="field_name" />
                </div>
                <div>
                  <label class="text-xs text-gray-500">Type</label>
                  <a-select v-model:value="field.type" size="small" class="w-full">
                    <a-select-option v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</a-select-option>
                  </a-select>
                </div>
                <div>
                  <label class="text-xs text-gray-500">Placeholder</label>
                  <a-input v-model:value="field.placeholder" size="small" placeholder="Placeholder text" />
                </div>
                <div v-if="['select', 'radio', 'checkbox'].includes(field.type)" class="col-span-2">
                  <label class="text-xs text-gray-500">Options (comma-separated)</label>
                  <a-input v-model:value="field.options" size="small" placeholder="Option 1, Option 2, Option 3" />
                </div>
                <div class="col-span-2">
                  <a-checkbox v-model:checked="field.required">Required</a-checkbox>
                </div>
              </div>
            </div>
          </div>

          <a-button type="dashed" block @click="addField">
            <template #icon><Plus :size="14" /></template>
            Add Field
          </a-button>

          <a-divider>Settings</a-divider>

          <a-form-item label="Email notifications to">
            <a-input v-model:value="editingForm.settings.emailTo" placeholder="admin@example.com" />
          </a-form-item>

          <a-form-item label="Email subject">
            <a-input v-model:value="editingForm.settings.emailSubject" placeholder="New form submission" />
          </a-form-item>

          <a-form-item label="Success message">
            <a-textarea v-model:value="editingForm.settings.successMessage" :rows="2" />
          </a-form-item>

          <a-form-item label="Redirect URL (optional)">
            <a-input v-model:value="editingForm.settings.redirectUrl" placeholder="https://..." />
          </a-form-item>
        </a-form>
      </a-spin>

      <template #footer>
        <div class="flex justify-end gap-2">
          <a-button @click="editorVisible = false">Cancel</a-button>
          <a-button type="primary" :loading="editorLoading" @click="saveForm">Save</a-button>
        </div>
      </template>
    </a-drawer>

    <!-- Submissions Drawer -->
    <a-drawer
      :open="subsVisible"
      :title="`Submissions — ${viewingFormName}`"
      :width="640"
      @close="subsVisible = false"
    >
      <a-spin :spinning="subsLoading">
        <div v-if="!submissions.length && !subsLoading" class="text-center py-12 text-gray-400">
          <Inbox :size="40" class="mx-auto mb-2 opacity-50" />
          <p class="text-sm">No submissions yet</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="sub in submissions"
            :key="sub.id"
            class="border rounded-lg p-4"
            :class="sub.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <a-tag v-if="!sub.isRead" color="blue" size="small">New</a-tag>
                <span class="text-xs text-gray-400">{{ formatDate(sub.createdAt) }}</span>
              </div>
              <div class="flex gap-1">
                <a-button v-if="!sub.isRead" type="text" size="small" @click="handleMarkRead(sub)">
                  <template #icon><Eye :size="14" /></template>
                </a-button>
                <a-button type="text" size="small" danger @click="handleDeleteSubmission(sub.id)">
                  <template #icon><Trash2 :size="14" /></template>
                </a-button>
              </div>
            </div>
            <div class="space-y-1">
              <div v-for="(val, key) in sub.parsedData" :key="key" class="flex gap-2">
                <span class="text-xs font-semibold text-gray-500 min-w-[80px]">{{ key }}:</span>
                <span class="text-sm text-gray-700">{{ val }}</span>
              </div>
            </div>
            <div v-if="sub.ipAddress" class="mt-2 text-[10px] text-gray-400">
              IP: {{ sub.ipAddress }}
            </div>
          </div>
        </div>

        <div v-if="subsTotal > 20" class="mt-4 text-center">
          <a-pagination
            v-model:current="subsPage"
            :total="subsTotal"
            :pageSize="20"
            size="small"
            @change="loadSubmissions"
          />
        </div>
      </a-spin>
    </a-drawer>
  </div>
</template>
