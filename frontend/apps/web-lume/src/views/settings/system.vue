<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Server, Settings, Globe, Shield, Box, ArrowRight } from 'lucide-vue-next';
import { getModules } from '@/api/modules';

defineOptions({ name: 'SystemView' });

const router = useRouter();
const loading = ref(false);
const moduleCount = ref(0);
const installedModules = ref<string[]>([]);

const systemInfo = {
  appName: 'Lume',
  version: '1.0.0',
  environment: import.meta.env.MODE || 'development',
  nodeEnv: import.meta.env.PROD ? 'production' : 'development',
  apiUrl: import.meta.env.VITE_API_URL || '/api',
};

const quickLinks = [
  { label: 'General Settings', path: '/settings/general', icon: Settings, description: 'App name, logo, branding' },
  { label: 'Localization', path: '/settings/localization', icon: Globe, description: 'Language, timezone, currency' },
  { label: 'Security', path: '/settings/security/access', icon: Shield, description: 'Access control & API keys' },
  { label: 'Modules', path: '/settings/modules', icon: Box, description: 'Installed modules & features' },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getModules();
    const mods = Array.isArray(res) ? res : (res as any)?.data || (res as any)?.modules || [];
    moduleCount.value = mods.length;
    installedModules.value = mods.map((m: any) => m.name || m.module_name || m.code || 'Unknown');
  } catch { moduleCount.value = 0; }
  finally { loading.value = false; }
}

function navigateTo(path: string) {
  router.push(path);
}

onMounted(() => { loadData(); });
</script>

<template>
  <div class="system-page p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold mb-1 flex items-center gap-2"><Server :size="24" /> System Information</h1>
      <p class="text-gray-500 m-0">Overview of system configuration and quick access to settings</p>
    </div>

    <a-row :gutter="[16, 16]">
      <!-- System Info Card -->
      <a-col :xs="24" :lg="12">
        <a-card title="System Details" :loading="loading">
          <a-descriptions :column="1" bordered size="small">
            <a-descriptions-item label="Application">{{ systemInfo.appName }}</a-descriptions-item>
            <a-descriptions-item label="Version">
              <a-tag color="blue">v{{ systemInfo.version }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Environment">
              <a-tag :color="systemInfo.nodeEnv === 'production' ? 'green' : 'orange'">{{ systemInfo.environment }}</a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="API Endpoint">
              <code class="text-xs">{{ systemInfo.apiUrl }}</code>
            </a-descriptions-item>
            <a-descriptions-item label="Installed Modules">
              <a-tag color="blue">{{ moduleCount }}</a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- Quick Links Card -->
      <a-col :xs="24" :lg="12">
        <a-card title="Quick Links">
          <div class="space-y-3">
            <div
              v-for="link in quickLinks" :key="link.path"
              class="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all"
              @click="navigateTo(link.path)"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <component :is="link.icon" :size="18" class="text-blue-500" />
                </div>
                <div>
                  <div class="font-medium text-sm">{{ link.label }}</div>
                  <div class="text-xs text-gray-400">{{ link.description }}</div>
                </div>
              </div>
              <ArrowRight :size="16" class="text-gray-300" />
            </div>
          </div>
        </a-card>
      </a-col>

      <!-- Installed Modules -->
      <a-col :span="24">
        <a-card title="Installed Modules" :loading="loading">
          <div v-if="installedModules.length" class="flex flex-wrap gap-2">
            <a-tag v-for="mod in installedModules" :key="mod" color="blue">
              <Box :size="12" class="inline mr-1" style="vertical-align: -1px" />{{ mod }}
            </a-tag>
          </div>
          <a-empty v-else description="No modules found" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<style scoped>
.system-page { min-height: 100%; }
</style>
