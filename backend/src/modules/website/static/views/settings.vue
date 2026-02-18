<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { Settings, Save, Globe, Palette, Search as SearchIcon, Share2, Code2, Paintbrush } from 'lucide-vue-next';
import { get, put } from '@/api/request';
import DesignTokensEditor from '../components/DesignTokensEditor.vue';

defineOptions({ name: 'WebsiteSettings' });

const loading = ref(false);
const saving = ref(false);

const form = reactive({
  // General
  site_name: '',
  site_tagline: '',
  homepage_slug: '',
  // Branding
  logo_url: '',
  favicon_url: '',
  primary_color: '#1677ff',
  // SEO
  default_meta_description: '',
  google_analytics_id: '',
  // Social
  social_twitter: '',
  social_facebook: '',
  social_linkedin: '',
  social_instagram: '',
  // Custom Code
  custom_head_code: '',
  // Design Tokens (stored as JSON string)
  design_tokens: '',
});

const designTokens = ref({
  colors: {} as Record<string, string>,
  typography: {} as Record<string, any>,
});

function settingsToForm(settings: any[]) {
  if (!Array.isArray(settings)) return;
  for (const s of settings) {
    const key = s.key as string;
    if (key in form) {
      (form as any)[key] = s.value || '';
    }
  }
  // Parse design tokens
  if (form.design_tokens) {
    try {
      designTokens.value = JSON.parse(form.design_tokens);
    } catch { /* keep defaults */ }
  }
}

function formToPayload() {
  // Serialize design tokens before saving
  form.design_tokens = JSON.stringify(designTokens.value);
  const entries = Object.entries(form).map(([key, value]) => ({
    key,
    value: value ?? '',
    type: 'string',
  }));
  return { settings: entries };
}

async function loadSettings() {
  loading.value = true;
  try {
    const data = await get('/website/settings');
    const settings = Array.isArray(data) ? data : data?.rows || data?.data || data?.settings || [];
    settingsToForm(settings);
  } catch (err: any) {
    message.error('Failed to load settings');
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  try {
    await put('/website/settings', formToPayload());
    message.success('Settings saved successfully');
  } catch (err: any) {
    message.error(err?.message || 'Failed to save settings');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <Settings :size="20" class="text-gray-600" />
        </div>
        <div>
          <h1 class="text-xl font-semibold m-0">Website Settings</h1>
          <p class="text-sm text-gray-500 m-0">Configure global website options</p>
        </div>
      </div>
      <a-button type="primary" :loading="saving" @click="handleSave">
        <template #icon><Save :size="16" /></template>
        Save Settings
      </a-button>
    </div>

    <a-spin :spinning="loading">
      <div class="max-w-3xl space-y-6">

        <!-- General -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Globe :size="16" class="text-blue-500" />
              General
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Site Name">
              <a-input v-model:value="form.site_name" placeholder="My Website" />
            </a-form-item>
            <a-form-item label="Site Tagline">
              <a-input v-model:value="form.site_tagline" placeholder="A short description of your site" />
            </a-form-item>
            <a-form-item label="Homepage Slug">
              <a-input v-model:value="form.homepage_slug" placeholder="home">
                <template #addonBefore>/</template>
              </a-input>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- Branding -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Palette :size="16" class="text-purple-500" />
              Branding
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Logo URL">
              <a-input v-model:value="form.logo_url" placeholder="https://..." />
              <div v-if="form.logo_url" class="mt-2 p-2 border rounded inline-block bg-gray-50">
                <img :src="form.logo_url" alt="Logo preview" class="max-h-12" />
              </div>
            </a-form-item>
            <a-form-item label="Favicon URL">
              <a-input v-model:value="form.favicon_url" placeholder="https://..." />
              <div v-if="form.favicon_url" class="mt-2 flex items-center gap-2">
                <img :src="form.favicon_url" alt="Favicon preview" class="w-6 h-6" />
                <span class="text-xs text-gray-400">Preview</span>
              </div>
            </a-form-item>
            <a-form-item label="Primary Color">
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="form.primary_color"
                  class="w-10 h-10 rounded border cursor-pointer"
                  style="padding: 2px;"
                />
                <a-input v-model:value="form.primary_color" placeholder="#1677ff" style="width: 140px" />
              </div>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- SEO -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <SearchIcon :size="16" class="text-green-500" />
              SEO
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Default Meta Description">
              <a-textarea
                v-model:value="form.default_meta_description"
                placeholder="Default meta description for pages without one"
                :rows="3"
              />
            </a-form-item>
            <a-form-item label="Google Analytics ID">
              <a-input v-model:value="form.google_analytics_id" placeholder="G-XXXXXXXXXX" />
            </a-form-item>
          </a-form>
        </a-card>

        <!-- Social Links -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Share2 :size="16" class="text-pink-500" />
              Social Links
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Twitter / X">
              <a-input v-model:value="form.social_twitter" placeholder="https://twitter.com/..." />
            </a-form-item>
            <a-form-item label="Facebook">
              <a-input v-model:value="form.social_facebook" placeholder="https://facebook.com/..." />
            </a-form-item>
            <a-form-item label="LinkedIn">
              <a-input v-model:value="form.social_linkedin" placeholder="https://linkedin.com/in/..." />
            </a-form-item>
            <a-form-item label="Instagram">
              <a-input v-model:value="form.social_instagram" placeholder="https://instagram.com/..." />
            </a-form-item>
          </a-form>
        </a-card>

        <!-- Custom Code -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Code2 :size="16" class="text-orange-500" />
              Custom Code
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Custom Head Code">
              <a-textarea
                v-model:value="form.custom_head_code"
                placeholder="<!-- Add custom scripts, styles, or meta tags here -->"
                :rows="6"
                style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
              />
              <p class="text-xs text-gray-400 mt-1 m-0">
                This code will be injected into the &lt;head&gt; section of every page.
              </p>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- Design Tokens -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Paintbrush :size="16" class="text-indigo-500" />
              Design Tokens
            </div>
          </template>
          <DesignTokensEditor v-model="designTokens" />
        </a-card>

      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.space-y-6 > * + * {
  margin-top: 24px;
}
</style>
