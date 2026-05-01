<template>
  <div class="developer-portal">
    <!-- Header -->
    <div class="portal-header">
      <h1>Developer Portal</h1>
      <p>Submit and manage your plugins</p>
    </div>

    <a-row :gutter="[24, 24]">
      <!-- Submit Plugin Card -->
      <a-col :xs="24" :lg="8">
        <a-card title="Submit Plugin" class="submit-card">
          <a-form :model="newPlugin" layout="vertical" @finish="handleSubmit">
            <a-form-item
              label="Plugin Name"
              name="pluginName"
              :rules="[{ required: true, message: 'Please enter plugin name' }]"
            >
              <a-input
                v-model:value="newPlugin.pluginName"
                placeholder="e.g., my-crm-plugin"
              />
            </a-form-item>

            <a-form-item
              label="Display Name"
              name="displayName"
              :rules="[{ required: true, message: 'Please enter display name' }]"
            >
              <a-input
                v-model:value="newPlugin.displayName"
                placeholder="e.g., My CRM Plugin"
              />
            </a-form-item>

            <a-form-item
              label="Manifest URL"
              name="manifestUrl"
              :rules="[{ required: true, message: 'Please enter manifest URL' }]"
            >
              <a-input
                v-model:value="newPlugin.manifestUrl"
                placeholder="https://example.com/manifest.json"
              />
            </a-form-item>

            <a-button
              type="primary"
              html-type="submit"
              block
              :loading="submitting"
            >
              Submit for Review
            </a-button>
          </a-form>
        </a-card>
      </a-col>

      <!-- My Plugins List -->
      <a-col :xs="24" :lg="16">
        <a-card title="My Plugins" :loading="loading">
          <a-spin :spinning="loading">
            <a-table
              v-if="myPlugins.length > 0"
              :columns="pluginColumns"
              :data-source="myPlugins"
              :pagination="false"
              rowKey="name"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <a-tag
                    :color="getStatusColor(record.status)"
                  >
                    {{ record.status }}
                  </a-tag>
                </template>

                <template v-else-if="column.key === 'action'">
                  <a-space>
                    <a-button
                      type="link"
                      size="small"
                      @click="viewAnalytics(record.name)"
                    >
                      Analytics
                    </a-button>
                    <a-button
                      v-if="record.status === 'active'"
                      type="link"
                      size="small"
                      @click="editPlugin(record.name)"
                    >
                      Edit
                    </a-button>
                  </a-space>
                </template>
              </template>
            </a-table>

            <a-empty
              v-else
              description="No plugins submitted yet"
              style="margin-top: 20px"
            />
          </a-spin>
        </a-card>

        <!-- Analytics Modal -->
        <a-modal
          v-model:visible="analyticsVisible"
          title="Plugin Analytics"
          :footer="null"
        >
          <a-spin :spinning="analyticsLoading">
            <div v-if="selectedAnalytics">
              <a-row :gutter="[16, 16]">
                <a-col :xs="24" :sm="8">
                  <div class="stat-box">
                    <div class="stat-value">
                      {{ selectedAnalytics.downloads }}
                    </div>
                    <div class="stat-label">Total Downloads</div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <div class="stat-box">
                    <div class="stat-value">
                      {{ selectedAnalytics.installs }}
                    </div>
                    <div class="stat-label">Total Installs</div>
                  </div>
                </a-col>
                <a-col :xs="24" :sm="8">
                  <div class="stat-box">
                    <div class="stat-value">
                      {{ selectedAnalytics.rating }}
                    </div>
                    <div class="stat-label">Avg Rating</div>
                  </div>
                </a-col>
              </a-row>

              <a-divider />

              <h3>Trends</h3>
              <a-descriptions :column="1" bordered>
                <a-descriptions-item label="Last Week Downloads">
                  {{ selectedAnalytics.trend?.downloadsLastWeek || 0 }}
                </a-descriptions-item>
                <a-descriptions-item label="Last Month Downloads">
                  {{ selectedAnalytics.trend?.downloadsLastMonth || 0 }}
                </a-descriptions-item>
                <a-descriptions-item label="Last Week Installs">
                  {{ selectedAnalytics.trend?.installsLastWeek || 0 }}
                </a-descriptions-item>
                <a-descriptions-item label="Last Month Installs">
                  {{ selectedAnalytics.trend?.installsLastMonth || 0 }}
                </a-descriptions-item>
              </a-descriptions>
            </div>
          </a-spin>
        </a-modal>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { developerAPI } from '../api/developer';

// State
const myPlugins = ref<any[]>([]);
const loading = ref(false);
const submitting = ref(false);
const analyticsVisible = ref(false);
const analyticsLoading = ref(false);
const selectedAnalytics = ref<any>(null);
const newPlugin = ref({
  pluginName: '',
  displayName: '',
  manifestUrl: '',
});

// Columns for plugins table
const pluginColumns = [
  {
    title: 'Display Name',
    dataIndex: 'displayName',
    key: 'displayName',
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: 'Submitted',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 120,
    customRender: ({ text }: any) => {
      return new Date(text).toLocaleDateString();
    },
  },
  {
    title: 'Action',
    key: 'action',
    width: 150,
  },
];

// Methods
const loadMyPlugins = async () => {
  try {
    loading.value = true;
    const result = await developerAPI.getMyPlugins();
    if (result.success) {
      myPlugins.value = result.data || [];
    } else {
      message.error('Failed to load plugins');
    }
  } catch (error) {
    message.error('Error loading plugins');
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const handleSubmit = async () => {
  try {
    submitting.value = true;
    const result = await developerAPI.submitPlugin(newPlugin.value);
    if (result.success) {
      message.success('Plugin submitted for review');
      newPlugin.value = { pluginName: '', displayName: '', manifestUrl: '' };
      await loadMyPlugins();
    } else {
      message.error(result.error || 'Failed to submit plugin');
    }
  } catch (error) {
    message.error('Error submitting plugin');
    console.error(error);
  } finally {
    submitting.value = false;
  }
};

const viewAnalytics = async (name: string) => {
  try {
    analyticsLoading.value = true;
    analyticsVisible.value = true;
    const result = await developerAPI.getPluginAnalytics(name);
    if (result.success) {
      selectedAnalytics.value = result.data;
    } else {
      message.error('Failed to load analytics');
    }
  } catch (error) {
    message.error('Error loading analytics');
    console.error(error);
  } finally {
    analyticsLoading.value = false;
  }
};

const editPlugin = (name: string) => {
  message.info(`Edit plugin: ${name} (coming soon)`);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'green';
    case 'pending':
      return 'gold';
    case 'rejected':
      return 'red';
    default:
      return 'blue';
  }
};

// Lifecycle
onMounted(() => {
  loadMyPlugins();
});
</script>

<style scoped>
.developer-portal {
  padding: 20px;
}

.portal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  text-align: center;
}

.portal-header h1 {
  margin: 0;
  font-size: 32px;
  font-weight: bold;
}

.portal-header p {
  margin: 8px 0 0 0;
  opacity: 0.9;
}

.submit-card {
  height: 100%;
}

.stat-box {
  padding: 16px;
  background: #f5f5f5;
  border-radius: 4px;
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 12px;
  color: #666;
}
</style>
