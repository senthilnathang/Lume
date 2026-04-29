<template>
  <div class="modules-management">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold">Installed Modules</h2>
      <a-button type="primary" @click="showInstallDrawer = true">Install Module</a-button>
    </div>

    <!-- Modules Table -->
    <a-table :columns="columns" :data-source="modules" :loading="loading" :pagination="false" />

    <!-- Install Module Drawer -->
    <a-drawer
      v-model:open="showInstallDrawer"
      title="Install Module"
      placement="right"
      :width="400"
      @close="showInstallDrawer = false"
    >
      <a-form layout="vertical" :model="installForm">
        <a-form-item label="Module Name" required>
          <a-input v-model:value="installForm.moduleName" placeholder="e.g., crm" />
        </a-form-item>

        <a-form-item label="Manifest Path" required>
          <a-input v-model:value="installForm.manifestPath" placeholder="/path/to/manifest.json" />
        </a-form-item>

        <div class="flex gap-2 justify-end">
          <a-button @click="showInstallDrawer = false">Cancel</a-button>
          <a-button type="primary" @click="installModule" :loading="installing">Install</a-button>
        </div>
      </a-form>
    </a-drawer>

    <!-- Module Detail Drawer -->
    <a-drawer
      v-model:open="showDetailDrawer"
      title="Module Details"
      placement="right"
      :width="500"
      @close="showDetailDrawer = false"
    >
      <div v-if="selectedModule" class="space-y-4">
        <div>
          <label class="font-bold">Name</label>
          <p>{{ selectedModule.name }}</p>
        </div>
        <div>
          <label class="font-bold">Version</label>
          <p>{{ selectedModule.version }}</p>
        </div>
        <div>
          <label class="font-bold">Description</label>
          <p>{{ selectedModule.description || 'N/A' }}</p>
        </div>
        <div>
          <label class="font-bold">Dependencies</label>
          <div class="flex gap-2 flex-wrap">
            <a-tag v-for="dep in selectedModule.depends" :key="dep">{{ dep }}</a-tag>
            <span v-if="!selectedModule.depends?.length" class="text-gray-500">None</span>
          </div>
        </div>
        <div>
          <label class="font-bold">Entities</label>
          <p>{{ selectedModule.entities }} entity(ies)</p>
        </div>
        <div>
          <label class="font-bold">Workflows</label>
          <p>{{ selectedModule.workflows }} workflow(s)</p>
        </div>
        <div>
          <label class="font-bold">Permissions</label>
          <p>{{ selectedModule.permissions }} permission(s)</p>
        </div>

        <div class="flex gap-2 justify-end border-t pt-4">
          <a-button @click="reloadModule(selectedModule.name)" :loading="reloading">Reload</a-button>
          <a-popconfirm title="Confirm uninstall?" ok-text="Yes" cancel-text="No" @confirm="uninstallModule(selectedModule.name)">
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

interface Module {
  name: string;
  version: string;
  description: string;
  depends: string[];
  entities: number;
  workflows: number;
  permissions: number;
}

const modules = ref<Module[]>([]);
const loading = ref(false);
const showInstallDrawer = ref(false);
const showDetailDrawer = ref(false);
const selectedModule = ref<Module | null>(null);
const installing = ref(false);
const reloading = ref(false);

const installForm = ref({
  moduleName: '',
  manifestPath: '',
});

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Version', dataIndex: 'version', key: 'version', width: 100 },
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Entities', dataIndex: 'entities', key: 'entities', width: 100 },
  { title: 'Workflows', dataIndex: 'workflows', key: 'workflows', width: 120 },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    align: 'center',
    slots: { customRender: 'action' },
  },
];

const loadModules = async () => {
  loading.value = true;
  try {
    const data = await get('/api/admin/modules');
    modules.value = data;
  } catch (error) {
    message.error('Failed to load modules');
  } finally {
    loading.value = false;
  }
};

const installModule = async () => {
  if (!installForm.value.moduleName || !installForm.value.manifestPath) {
    message.error('Please fill in all fields');
    return;
  }

  installing.value = true;
  try {
    await post(`/api/admin/modules/${installForm.value.moduleName}/install`, {
      manifestPath: installForm.value.manifestPath,
    });
    message.success('Module installed successfully');
    showInstallDrawer.value = false;
    installForm.value = { moduleName: '', manifestPath: '' };
    await loadModules();
  } catch (error) {
    message.error('Failed to install module');
  } finally {
    installing.value = false;
  }
};

const viewDetails = (module: Module) => {
  selectedModule.value = module;
  showDetailDrawer.value = true;
};

const reloadModule = async (moduleName: string) => {
  reloading.value = true;
  try {
    await post(`/api/admin/modules/${moduleName}/reload`, {});
    message.success('Module reloaded successfully');
    await loadModules();
  } catch (error) {
    message.error('Failed to reload module');
  } finally {
    reloading.value = false;
  }
};

const uninstallModule = async (moduleName: string) => {
  try {
    await del(`/api/admin/modules/${moduleName}`);
    message.success('Module uninstalled successfully');
    showDetailDrawer.value = false;
    await loadModules();
  } catch (error) {
    message.error('Failed to uninstall module');
  }
};

onMounted(() => {
  loadModules();
});
</script>

<style scoped>
.modules-management {
  /* scoped styles */
}
</style>
