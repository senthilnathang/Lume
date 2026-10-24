<script setup>
import { ref, onMounted } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Card,
  Form,
  FormItem,
  Input,
  Button,
  Select,
  SelectOption,
  Switch,
  Tabs,
  TabPane,
  Divider,
  message,
  Spin,
} from 'ant-design-vue';

import { SaveOutlined, GlobalOutlined, MailOutlined, ShareAltOutlined } from '@ant-design/icons-vue';

defineOptions({
  name: 'SettingsGeneral',
});

const loading = ref(false);
const activeTab = ref('general');

const settings = ref({
  general: {
    siteName: 'Gawdesy',
    siteDescription: 'NGO Management Platform',
    timezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    language: 'en',
  },
  contact: {
    email: 'info@gawdesy.org',
    phone: '+1 234 567 890',
    address: '123 NGO Street, City, Country',
    website: 'https://gawdesy.org',
  },
  localization: {
    currency: 'USD',
    currencySymbol: '$',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    weekStart: 'monday',
  },
  social: {
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
  },
});

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
];

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'JPY', label: 'Japanese Yen (¥)' },
  { value: 'INR', label: 'Indian Rupee (₹)' },
];

async function loadSettings() {
  loading.value = true;
  try {
    // Simulated API call
    await new Promise(r => setTimeout(r, 500));
  } catch (error) {
    message.error('Failed to load settings');
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  loading.value = true;
  try {
    await new Promise(r => setTimeout(r, 500));
    message.success('Settings saved successfully');
  } catch (error) {
    message.error('Failed to save settings');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadSettings();
});
</script>

<template>
  <Page title="Settings" :description="activeTab === 'general' ? 'General application settings' : ''">
    <Spin :spinning="loading">
      <Tabs v-model:activeKey="activeTab" class="settings-tabs">
        <TabPane key="general" tab="General">
          <Card title="General Settings" class="mb-4">
            <Form layout="vertical">
              <FormItem label="Site Name">
                <Input v-model:value="settings.general.siteName" placeholder="Enter site name" />
              </FormItem>
              <FormItem label="Site Description">
                <Input
                  v-model:value="settings.general.siteDescription"
                  type="textarea"
                  placeholder="Enter site description"
                  :rows="3"
                />
              </FormItem>
              <FormItem label="Timezone">
                <Select v-model:value="settings.general.timezone" placeholder="Select timezone">
                  <SelectOption v-for="tz in timezones" :key="tz.value" :value="tz.value">
                    {{ tz.label }}
                  </SelectOption>
                </Select>
              </FormItem>
              <FormItem label="Language">
                <Select v-model:value="settings.general.language" placeholder="Select language">
                  <SelectOption value="en">English</SelectOption>
                  <SelectOption value="es">Spanish</SelectOption>
                  <SelectOption value="fr">French</SelectOption>
                  <SelectOption value="de">German</SelectOption>
                </Select>
              </FormItem>
            </Form>
          </Card>
        </TabPane>

        <TabPane key="contact" tab="Contact">
          <Card title="Contact Information" class="mb-4">
            <Form layout="vertical">
              <FormItem label="Email">
                <Input v-model:value="settings.contact.email" placeholder="contact@email.com">
                  <template #prefix>
                    <MailOutlined />
                  </template>
                </Input>
              </FormItem>
              <FormItem label="Phone">
                <Input v-model:value="settings.contact.phone" placeholder="+1 234 567 890" />
              </FormItem>
              <FormItem label="Address">
                <Input
                  v-model:value="settings.contact.address"
                  type="textarea"
                  placeholder="Enter address"
                  :rows="3"
                />
              </FormItem>
              <FormItem label="Website">
                <Input v-model:value="settings.contact.website" placeholder="https://website.com" />
              </FormItem>
            </Form>
          </Card>
        </TabPane>

        <TabPane key="localization" tab="Localization">
          <Card title="Localization Settings" class="mb-4">
            <Form layout="vertical">
              <FormItem label="Currency">
                <Select v-model:value="settings.localization.currency" placeholder="Select currency">
                  <SelectOption v-for="cur in currencies" :key="cur.value" :value="cur.value">
                    {{ cur.label }}
                  </SelectOption>
                </Select>
              </FormItem>
              <FormItem label="Currency Symbol">
                <Input
                  v-model:value="settings.localization.currencySymbol"
                  placeholder="$"
                  :maxlength="3"
                  style="width: 100px"
                />
              </FormItem>
              <FormItem label="Date Format">
                <Select v-model:value="settings.localization.dateFormat" placeholder="Select date format">
                  <SelectOption value="YYYY-MM-DD">YYYY-MM-DD</SelectOption>
                  <SelectOption value="DD/MM/YYYY">DD/MM/YYYY</SelectOption>
                  <SelectOption value="MM/DD/YYYY">MM/DD/YYYY</SelectOption>
                </Select>
              </FormItem>
              <FormItem label="Time Format">
                <Select v-model:value="settings.localization.timeFormat" placeholder="Select time format">
                  <SelectOption value="HH:mm">24 Hour (HH:mm)</SelectOption>
                  <SelectOption value="hh:mm A">12 Hour (hh:mm A)</SelectOption>
                </Select>
              </FormItem>
            </Form>
          </Card>
        </TabPane>

        <TabPane key="social" tab="Social">
          <Card title="Social Media Links" class="mb-4">
            <Form layout="vertical">
              <FormItem label="Facebook">
                <Input v-model:value="settings.social.facebook" placeholder="https://facebook.com/yourpage" />
              </FormItem>
              <FormItem label="Twitter">
                <Input v-model:value="settings.social.twitter" placeholder="https://twitter.com/yourhandle" />
              </FormItem>
              <FormItem label="Instagram">
                <Input v-model:value="settings.social.instagram" placeholder="https://instagram.com/yourhandle" />
              </FormItem>
              <FormItem label="LinkedIn">
                <Input v-model:value="settings.social.linkedin" placeholder="https://linkedin.com/company/yourcompany" />
              </FormItem>
              <FormItem label="YouTube">
                <Input v-model:value="settings.social.youtube" placeholder="https://youtube.com/@yourchannel" />
              </FormItem>
            </Form>
          </Card>
        </TabPane>
      </Tabs>

      <div class="flex justify-end gap-2 mt-4">
        <Button @click="loadSettings">Reset</Button>
        <Button type="primary" @click="saveSettings">
          <SaveOutlined />
          Save Changes
        </Button>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.settings-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-4 {
  margin-top: 16px;
}
</style>
