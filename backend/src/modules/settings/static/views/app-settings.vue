<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { Settings, Save, RefreshCw, RotateCcw, Sliders, Mail, Globe, Share2 } from 'lucide-vue-next';
import { getSettingsByCategory, bulkSetSettings, initializeDefaults, type BulkSettingData } from '@modules/settings/static/api/index';

defineOptions({ name: 'AppSettingsView' });

const route = useRoute();

interface FieldConfig {
  key: string;
  label: string;
  type: 'input' | 'textarea' | 'switch' | 'select';
  inputType?: string;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

interface CategoryConfig {
  title: string;
  description: string;
  icon: any;
  fields: FieldConfig[];
}

const categoryConfig: Record<string, CategoryConfig> = {
  general: {
    title: 'General Settings',
    description: 'Basic site configuration',
    icon: Sliders,
    fields: [
      { key: 'site_name', label: 'Site Name', type: 'input', placeholder: 'Your organization name' },
      { key: 'site_description', label: 'Site Description', type: 'textarea', placeholder: 'Brief description of your organization' },
      { key: 'site_logo', label: 'Site Logo URL', type: 'input', placeholder: 'https://...' },
      { key: 'maintenance_mode', label: 'Maintenance Mode', type: 'switch' },
    ],
  },
  contact: {
    title: 'Contact Information',
    description: 'Contact details for your organization',
    icon: Mail,
    fields: [
      { key: 'contact_email', label: 'Contact Email', type: 'input', inputType: 'email', placeholder: 'contact@example.com' },
      { key: 'contact_phone', label: 'Contact Phone', type: 'input', placeholder: '+1 (555) 123-4567' },
      { key: 'address', label: 'Address', type: 'textarea', placeholder: 'Full address' },
    ],
  },
  localization: {
    title: 'Localization',
    description: 'Regional and language preferences',
    icon: Globe,
    fields: [
      {
        key: 'currency', label: 'Currency', type: 'select',
        options: [
          { label: 'USD - US Dollar', value: 'USD' },
          { label: 'EUR - Euro', value: 'EUR' },
          { label: 'GBP - British Pound', value: 'GBP' },
          { label: 'LKR - Sri Lankan Rupee', value: 'LKR' },
          { label: 'INR - Indian Rupee', value: 'INR' },
          { label: 'AUD - Australian Dollar', value: 'AUD' },
        ],
      },
      {
        key: 'timezone', label: 'Timezone', type: 'select',
        options: [
          { label: 'UTC', value: 'UTC' },
          { label: 'US/Eastern', value: 'US/Eastern' },
          { label: 'US/Pacific', value: 'US/Pacific' },
          { label: 'Europe/London', value: 'Europe/London' },
          { label: 'Asia/Colombo', value: 'Asia/Colombo' },
          { label: 'Asia/Kolkata', value: 'Asia/Kolkata' },
          { label: 'Australia/Sydney', value: 'Australia/Sydney' },
        ],
      },
      {
        key: 'date_format', label: 'Date Format', type: 'select',
        options: [
          { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
          { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
          { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
          { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY' },
        ],
      },
    ],
  },
  social: {
    title: 'Social Media',
    description: 'Social media profile links',
    icon: Share2,
    fields: [
      { key: 'social_facebook', label: 'Facebook', type: 'input', placeholder: 'https://facebook.com/...' },
      { key: 'social_twitter', label: 'Twitter / X', type: 'input', placeholder: 'https://x.com/...' },
      { key: 'social_instagram', label: 'Instagram', type: 'input', placeholder: 'https://instagram.com/...' },
      { key: 'social_linkedin', label: 'LinkedIn', type: 'input', placeholder: 'https://linkedin.com/in/...' },
      { key: 'social_youtube', label: 'YouTube', type: 'input', placeholder: 'https://youtube.com/...' },
    ],
  },
};

// State
const loading = ref(false);
const saving = ref(false);
const formValues = ref<Record<string, any>>({});

const category = computed(() => {
  const segments = route.path.split('/');
  return segments[segments.length - 1] || 'general';
});

const currentConfig = computed(() => categoryConfig[category.value] || categoryConfig.general);

// Methods
async function loadSettings() {
  loading.value = true;
  try {
    const res = await getSettingsByCategory(category.value);
    const settings = Array.isArray(res) ? res : (res as any)?.data || [];
    const values: Record<string, any> = {};
    for (const field of currentConfig.value.fields) {
      values[field.key] = '';
    }
    for (const setting of settings) {
      if (setting.type === 'boolean') {
        values[setting.key] = setting.value === 'true' || setting.value === true;
      } else {
        values[setting.key] = setting.value ?? '';
      }
    }
    formValues.value = values;
  } catch (error) {
    message.error('Failed to load settings');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    const settings: BulkSettingData[] = currentConfig.value.fields.map((field) => {
      let value = formValues.value[field.key];
      let type = 'string';
      if (field.type === 'switch') {
        value = String(value);
        type = 'boolean';
      }
      return {
        key: field.key,
        value,
        type,
        category: category.value,
      };
    });
    await bulkSetSettings(settings);
    message.success('Settings saved successfully');
  } catch (error: any) {
    message.error(error?.message || 'Failed to save settings');
  } finally {
    saving.value = false;
  }
}

function handleInitialize() {
  Modal.confirm({
    title: 'Initialize Default Settings',
    content: 'This will reset all settings to their default values. Existing settings will be overwritten. Continue?',
    okText: 'Initialize',
    okType: 'danger',
    async onOk() {
      try {
        await initializeDefaults();
        message.success('Default settings initialized');
        await loadSettings();
      } catch (error: any) {
        message.error(error?.message || 'Failed to initialize');
      }
    },
  });
}

watch(() => route.path, () => { loadSettings(); });
onMounted(() => { loadSettings(); });
</script>

<template>
  <div class="app-settings-page p-6">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-1 flex items-center gap-2">
          <component :is="currentConfig.icon" :size="24" />
          {{ currentConfig.title }}
        </h1>
        <p class="text-gray-500 m-0">{{ currentConfig.description }}</p>
      </div>
      <div class="flex items-center gap-2">
        <a-button @click="loadSettings" :loading="loading">
          <template #icon><RefreshCw :size="14" /></template>
          Refresh
        </a-button>
        <a-button @click="handleInitialize">
          <template #icon><RotateCcw :size="14" /></template>
          Initialize Defaults
        </a-button>
      </div>
    </div>

    <!-- Settings Form -->
    <a-card>
      <a-spin :spinning="loading">
        <a-form layout="vertical">
          <template v-for="field in currentConfig.fields" :key="field.key">
            <a-form-item :label="field.label">
              <!-- Input -->
              <a-input
                v-if="field.type === 'input'"
                v-model:value="formValues[field.key]"
                :placeholder="field.placeholder"
                :type="field.inputType || 'text'"
              />
              <!-- Textarea -->
              <a-textarea
                v-else-if="field.type === 'textarea'"
                v-model:value="formValues[field.key]"
                :placeholder="field.placeholder"
                :rows="3"
              />
              <!-- Switch -->
              <a-switch
                v-else-if="field.type === 'switch'"
                v-model:checked="formValues[field.key]"
                checked-children="Enabled"
                un-checked-children="Disabled"
              />
              <!-- Select -->
              <a-select
                v-else-if="field.type === 'select'"
                v-model:value="formValues[field.key]"
                :placeholder="field.placeholder || `Select ${field.label}`"
                style="width: 100%"
              >
                <a-select-option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </template>
        </a-form>

        <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-100">
          <a-button @click="loadSettings">
            <template #icon><RotateCcw :size="14" /></template>
            Reset
          </a-button>
          <a-button type="primary" :loading="saving" @click="handleSave">
            <template #icon><Save :size="14" /></template>
            Save Changes
          </a-button>
        </div>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
.app-settings-page { min-height: 100%; }
</style>
