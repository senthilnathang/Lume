<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { Settings, Save, Globe, Palette, Search as SearchIcon, Share2, Code2, Paintbrush, Play, Droplets } from 'lucide-vue-next';
import { get, put } from '@/api/request';
import DesignTokensEditor from '../components/DesignTokensEditor.vue';
import FontPicker from '../components/FontPicker.vue';

defineOptions({ name: 'WebsiteSettings' });

const loading = ref(false);
const saving = ref(false);
const activeTab = ref('general');
const savingDesign = ref(false);

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
  custom_body_code: '',
  // SEO
  robots_txt: '',
  // Design Tokens (stored as JSON string)
  design_tokens: '',
  // Page Transitions
  transition_type: 'none',
  transition_color: '#ffffff',
  preloader_type: 'none',
  // Design system
  color_primary: '#1677ff',
  color_secondary: '#0050b3',
  color_accent: '#faad14',
  color_neutral: '#6b7280',
  font_heading: 'Inter, sans-serif',
  font_body: 'Inter, sans-serif',
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

async function handleSaveDesign() {
  savingDesign.value = true;
  try {
    // Serialize design tokens before saving
    form.design_tokens = JSON.stringify(designTokens.value);
    const designEntries = [
      'color_primary', 'color_secondary', 'color_accent', 'color_neutral',
      'font_heading', 'font_body', 'design_tokens',
    ].map((key) => ({ key, value: (form as any)[key] ?? '', type: 'string' }));
    await put('/website/settings', { settings: designEntries });
    message.success('Design settings saved');
  } catch (err: any) {
    message.error(err?.message || 'Failed to save design settings');
  } finally {
    savingDesign.value = false;
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
      <a-tabs v-model:activeKey="activeTab" class="max-w-4xl">

        <!-- General Tab -->
        <a-tab-pane key="general">
          <template #tab>
            <span class="flex items-center gap-1.5"><Globe :size="14" /> General</span>
          </template>
          <div class="space-y-4 pt-2">
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
          </div>
        </a-tab-pane>

        <!-- Branding Tab -->
        <a-tab-pane key="branding">
          <template #tab>
            <span class="flex items-center gap-1.5"><Palette :size="14" /> Branding</span>
          </template>
          <div class="space-y-4 pt-2">
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
          </div>
        </a-tab-pane>

        <!-- SEO Tab -->
        <a-tab-pane key="seo">
          <template #tab>
            <span class="flex items-center gap-1.5"><SearchIcon :size="14" /> SEO</span>
          </template>
          <div class="space-y-4 pt-2">
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
            <a-form-item label="robots.txt Content">
              <a-textarea
                v-model:value="form.robots_txt"
                placeholder="User-agent: *
Allow: /
Sitemap: https://yoursite.com/sitemap.xml"
                :rows="6"
                style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
              />
              <p class="text-xs text-gray-400 mt-1 m-0">
                Served at <code>/robots.txt</code>. Default allows all crawlers.
              </p>
            </a-form-item>
          </a-form>
        </a-card>
          </div>
        </a-tab-pane>

        <!-- Social Tab -->
        <a-tab-pane key="social">
          <template #tab>
            <span class="flex items-center gap-1.5"><Share2 :size="14" /> Social</span>
          </template>
          <div class="space-y-4 pt-2">
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
          </div>
        </a-tab-pane>

        <!-- Custom Code Tab -->
        <a-tab-pane key="code">
          <template #tab>
            <span class="flex items-center gap-1.5"><Code2 :size="14" /> Code</span>
          </template>
          <div class="space-y-4 pt-2">
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Code2 :size="16" class="text-orange-500" />
              Custom Code Injection
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Head Scripts">
              <a-textarea
                v-model:value="form.custom_head_code"
                placeholder="<!-- Scripts, meta tags, or styles injected inside <head> -->"
                :rows="6"
                style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
              />
              <p class="text-xs text-gray-400 mt-1 m-0">
                Injected into the <code>&lt;head&gt;</code> of every public page (GA tags, hreflang, etc.).
              </p>
            </a-form-item>
            <a-form-item label="Body Scripts">
              <a-textarea
                v-model:value="form.custom_body_code"
                placeholder="<!-- Scripts injected just before </body> (chat widgets, pixels, etc.) -->"
                :rows="6"
                style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 13px;"
              />
              <p class="text-xs text-gray-400 mt-1 m-0">
                Injected at the end of <code>&lt;body&gt;</code> on every public page.
              </p>
            </a-form-item>
          </a-form>
        </a-card>
          </div>
        </a-tab-pane>

        <!-- Design Tab -->
        <a-tab-pane key="design">
          <template #tab>
            <span class="flex items-center gap-1.5"><Droplets :size="14" /> Design</span>
          </template>
          <div class="space-y-4 pt-2">

        <!-- Design Tokens (colors + typography sliders) -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Paintbrush :size="16" class="text-indigo-500" />
              Design Tokens
            </div>
          </template>
          <DesignTokensEditor v-model="designTokens" />
        </a-card>

        <!-- Font Selection (heading + body via FontPicker) -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Code2 :size="16" class="text-blue-500" />
              Fonts
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Heading Font">
              <FontPicker v-model="form.font_heading" />
              <p class="text-xs text-gray-400 mt-1 m-0">Applied to h1–h6 via <code>--lume-font-heading</code>.</p>
            </a-form-item>
            <a-form-item label="Body Font">
              <FontPicker v-model="form.font_body" />
              <p class="text-xs text-gray-400 mt-1 m-0">Applied to body text via <code>--lume-font-body</code>.</p>
            </a-form-item>
          </a-form>
        </a-card>

        <!-- Quick color overrides -->
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Palette :size="16" class="text-pink-500" />
              Quick Color Overrides
            </div>
          </template>
          <p class="text-xs text-gray-400 mb-3 m-0">These map to <code>--lume-primary</code> etc. and override token values.</p>
          <a-form layout="vertical">
            <div class="grid grid-cols-2 gap-4">
              <a-form-item label="Primary">
                <div class="flex items-center gap-2">
                  <input type="color" v-model="form.color_primary" class="w-10 h-10 rounded border cursor-pointer" style="padding: 2px;" />
                  <a-input v-model:value="form.color_primary" placeholder="#1677ff" />
                </div>
              </a-form-item>
              <a-form-item label="Secondary">
                <div class="flex items-center gap-2">
                  <input type="color" v-model="form.color_secondary" class="w-10 h-10 rounded border cursor-pointer" style="padding: 2px;" />
                  <a-input v-model:value="form.color_secondary" placeholder="#0050b3" />
                </div>
              </a-form-item>
              <a-form-item label="Accent">
                <div class="flex items-center gap-2">
                  <input type="color" v-model="form.color_accent" class="w-10 h-10 rounded border cursor-pointer" style="padding: 2px;" />
                  <a-input v-model:value="form.color_accent" placeholder="#faad14" />
                </div>
              </a-form-item>
              <a-form-item label="Neutral">
                <div class="flex items-center gap-2">
                  <input type="color" v-model="form.color_neutral" class="w-10 h-10 rounded border cursor-pointer" style="padding: 2px;" />
                  <a-input v-model:value="form.color_neutral" placeholder="#6b7280" />
                </div>
              </a-form-item>
            </div>
          </a-form>
        </a-card>

        <div class="flex justify-end pt-2">
          <a-button type="primary" :loading="savingDesign" @click="handleSaveDesign">
            <template #icon><Save :size="16" /></template>
            Save Design Settings
          </a-button>
        </div>
          </div>
        </a-tab-pane>

        <!-- Page Transitions Tab -->
        <a-tab-pane key="transitions">
          <template #tab>
            <span class="flex items-center gap-1.5"><Play :size="14" /> Transitions</span>
          </template>
          <div class="space-y-4 pt-2">
        <a-card size="small">
          <template #title>
            <div class="flex items-center gap-2">
              <Play :size="16" class="text-cyan-500" />
              Page Transitions
            </div>
          </template>
          <a-form layout="vertical">
            <a-form-item label="Transition Type">
              <a-select v-model:value="form.transition_type" placeholder="Select transition">
                <a-select-option value="none">None</a-select-option>
                <a-select-option value="fade">Fade</a-select-option>
                <a-select-option value="slide">Slide</a-select-option>
                <a-select-option value="circle">Circle Wipe</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="Transition Color">
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  v-model="form.transition_color"
                  class="w-10 h-10 rounded border cursor-pointer"
                  style="padding: 2px;"
                />
                <a-input v-model:value="form.transition_color" placeholder="#ffffff" style="width: 140px" />
              </div>
            </a-form-item>
            <a-form-item label="Preloader Type">
              <a-select v-model:value="form.preloader_type" placeholder="Select preloader">
                <a-select-option value="none">None</a-select-option>
                <a-select-option value="spinner">Spinner</a-select-option>
                <a-select-option value="dots">Dots</a-select-option>
                <a-select-option value="progress-bar">Progress Bar</a-select-option>
              </a-select>
            </a-form-item>
            <p class="text-xs text-gray-400 m-0">
              Page transitions are displayed during route changes on the public site.
            </p>
          </a-form>
        </a-card>
          </div>
        </a-tab-pane>

      </a-tabs>
    </a-spin>
  </div>
</template>

<style scoped>
.space-y-6 > * + * {
  margin-top: 24px;
}
</style>
