<template>
  <div class="plugins-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Installed Plugins</h2>
      <a-button type="primary" @click="showInstallDrawer = true">Install Plugin</a-button>
    </div>

    <!-- Plugins Grid -->
    <a-row :gutter="[16, 16]">
      <a-col :xs="24" :sm="12" :md="8" v-for="plugin in plugins" :key="plugin.name">
        <a-card :title="plugin.displayName || plugin.name" :loading="loading">
          <template #extra>
            <a-tag :color="plugin.enabled ? 'green' : 'red'">
              {{ plugin.enabled ? 'Enabled' : 'Disabled' }}
            </a-tag>
          </template>

          <div class="space-y-2">
            <div>
              <span class="text-gray-600 text-sm">Version:</span>
              <p class="font-mono">{{ plugin.version }}</p>
            </div>
            <div>
              <span class="text-gray-600 text-sm">Author:</span>
              <p>{{ plugin.author }}</p>
            </div>
            <div v-if="plugin.description">
              <span class="text-gray-600 text-sm">Description:</span>
              <p class="text-sm">{{ plugin.description }}</p>
            </div>
            <div v-if="Object.keys(plugin.dependencies || {}).length">
              <span class="text-gray-600 text-sm">Dependencies:</span>
              <div class="flex gap-2 flex-wrap mt-1">
                <a-tag v-for="(ver, dep) in plugin.dependencies" :key="dep" size="small">
                  {{ dep }} ({{ ver }})
                </a-tag>
              </div>
            </div>
          </div>

          <template #actions>
            <a-button
              v-if="plugin.enabled"
              type="text"
              danger
              size="small"
              @click="disablePlugin(plugin.name)"
              :loading="disabling === plugin.name"
            >
              Disable
            </a-button>
            <a-button
              v-else
              type="text"
              size="small"
              @click="enablePlugin(plugin.name)"
              :loading="enabling === plugin.name"
            >
              Enable
            </a-button>
            <a-popconfirm
              title="Confirm uninstall?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="uninstallPlugin(plugin.name)"
            >
              <a-button type="text" danger size="small">Uninstall</a-button>
            </a-popconfirm>
            <a-button type="text" size="small" @click="viewDetails(plugin)">Details</a-button>
          </template>
        </a-card>
      </a-col>
    </a-row>

    <!-- Install Plugin Drawer -->
    <a-drawer
      v-model:open="showInstallDrawer"
      title="Install Plugin"
      placement="right"
      :width="400"
      @close="showInstallDrawer = false"
    >
      <a-form layout="vertical" :model="installForm">
        <a-form-item label="Plugin Path" required>
          <a-input v-model:value="installForm.manifestPath" placeholder="/path/to/plugin/manifest.json" />
        </a-form-item>

        <a-form-item label="How to install:">
          <ol class="text-sm space-y-2 list-decimal list-inside">
            <li>Point to plugin manifest.json file</li>
            <li>Click Install to load and register</li>
            <li>Plugin will be enabled immediately</li>
          </ol>
        </a-form-item>

        <div class="flex gap-2 justify-end">
          <a-button @click="showInstallDrawer = false">Cancel</a-button>
          <a-button type="primary" @click="installPlugin" :loading="installing">Install</a-button>
        </div>
      </a-form>
    </a-drawer>

    <!-- Plugin Detail Drawer -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="Plugin Details"
      placement="right"
      :width="500"
      @close="showDetailDrawer = false"
    >
      <div v-if="selectedPlugin" class="space-y-4">
        <div>
          <label class="font-bold">Name</label>
          <p>{{ selectedPlugin.name }}</p>
        </div>
        <div>
          <label class="font-bold">Display Name</label>
          <p>{{ selectedPlugin.displayName || selectedPlugin.name }}</p>
        </div>
        <div>
          <label class="font-bold">Version</label>
          <p>{{ selectedPlugin.version }}</p>
        </div>
        <div>
          <label class="font-bold">Author</label>
          <p>{{ selectedPlugin.author }}</p>
        </div>
        <div>
          <label class="font-bold">Description</label>
          <p>{{ selectedPlugin.description || 'No description' }}</p>
        </div>
        <div>
          <label class="font-bold">Compatibility</label>
          <p class="font-mono text-sm">{{ selectedPlugin.compatibility }}</p>
        </div>
        <div>
          <label class="font-bold">Status</label>
          <a-tag :color="selectedPlugin.enabled ? 'green' : 'red'">
            {{ selectedPlugin.enabled ? 'Enabled' : 'Disabled' }}
          </a-tag>
        </div>
        <div v-if="Object.keys(selectedPlugin.dependencies || {}).length">
          <label class="font-bold">Dependencies</label>
          <ul class="space-y-1">
            <li v-for="(ver, dep) in selectedPlugin.dependencies" :key="dep" class="text-sm">
              <span class="font-mono">{{ dep }}: {{ ver }}</span>
            </li>
          </ul>
        </div>

        <div class="flex gap-2 justify-end border-t pt-4">
          <a-button @click="checkCompatibility" :loading="checking">Check Compatibility</a-button>
          <a-popconfirm
            title="Confirm uninstall?"
            ok-text="Yes"
            cancel-text="No"
            @confirm="uninstallPlugin(selectedPlugin.name)"
          >
            <a-button danger>Uninstall</a-button>
          </a-popconfirm>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { get, post, del } from '@/api/request';

interface Plugin {
  name: string;
  displayName: string;
  version: string;
  author: string;
  description?: string;
  compatibility: string;
  dependencies?: Record<string, string>;
  enabled: boolean;
}

const plugins = ref<Plugin[]>([]);
const loading = ref(false);
const showInstallDrawer = ref(false);
const showDetailDrawer = ref(false);
const selectedPlugin = ref<Plugin | null>(null);
const installing = ref(false);
const enabling = ref<string | null>(null);
const disabling = ref<string | null>(null);
const checking = ref(false);

const installForm = ref({
  manifestPath: '',
});

const loadPlugins = async () => {
  loading.value = true;
  try {
    const data = await get('/api/admin/plugins');
    plugins.value = data;
  } catch (error) {
    message.error('Failed to load plugins');
  } finally {
    loading.value = false;
  }
};

const installPlugin = async () => {
  if (!installForm.value.manifestPath) {
    message.error('Please provide a manifest path');
    return;
  }

  installing.value = true;
  try {
    await post('/api/admin/plugins/install', {
      manifestPath: installForm.value.manifestPath,
    });
    message.success('Plugin installed successfully');
    showInstallDrawer.value = false;
    installForm.value = { manifestPath: '' };
    await loadPlugins();
  } catch (error) {
    message.error('Failed to install plugin');
  } finally {
    installing.value = false;
  }
};

const enablePlugin = async (pluginName: string) => {
  enabling.value = pluginName;
  try {
    await post(`/api/admin/plugins/${pluginName}/enable`, {});
    message.success('Plugin enabled successfully');
    await loadPlugins();
  } catch (error) {
    message.error('Failed to enable plugin');
  } finally {
    enabling.value = null;
  }
};

const disablePlugin = async (pluginName: string) => {
  disabling.value = pluginName;
  try {
    await post(`/api/admin/plugins/${pluginName}/disable`, {});
    message.success('Plugin disabled successfully');
    await loadPlugins();
  } catch (error) {
    message.error('Failed to disable plugin');
  } finally {
    disabling.value = null;
  }
};

const uninstallPlugin = async (pluginName: string) => {
  try {
    await del(`/api/admin/plugins/${pluginName}`);
    message.success('Plugin uninstalled successfully');
    showDetailDrawer.value = false;
    await loadPlugins();
  } catch (error) {
    message.error('Failed to uninstall plugin');
  }
};

const viewDetails = (plugin: Plugin) => {
  selectedPlugin.value = plugin;
  showDetailDrawer.value = true;
};

const checkCompatibility = async () => {
  if (!selectedPlugin.value) return;

  checking.value = true;
  try {
    const result = await post('/api/admin/plugins/check-compatibility', {
      pluginName: selectedPlugin.value.name,
    });
    message.success('Compatibility check completed');
  } catch (error) {
    message.error('Failed to check compatibility');
  } finally {
    checking.value = false;
  }
};

onMounted(() => {
  loadPlugins();
});
</script>

<style scoped>
.plugins-management {
  /* scoped styles */
}
</style>
