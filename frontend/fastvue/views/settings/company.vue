<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Switch,
  Tag,
} from 'ant-design-vue';
import {
  BankOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';

import {
  type BaseApi,
  getCompaniesApi,
  updateCompanyApi,
} from '#/api/base';
import { $t as _$t } from '#/locales';

defineOptions({
  name: 'CompanySettings',
});

const loading = ref(false);
const submitting = ref(false);
const companies = ref<BaseApi.Company[]>([]);
const selectedCompanyId = ref<number | null>(null);

const formState = reactive({
  company: '',
  date_format: 'YYYY-MM-DD',
  time_format: 'HH:mm:ss',
  hq: false,
});

const dateFormatOptions = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-15)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/01/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/15/2024)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (15-01-2024)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (15.01.2024)' },
];

const timeFormatOptions = [
  { value: 'HH:mm:ss', label: '24-hour (14:30:00)' },
  { value: 'HH:mm', label: '24-hour short (14:30)' },
  { value: 'hh:mm:ss A', label: '12-hour (02:30:00 PM)' },
  { value: 'hh:mm A', label: '12-hour short (02:30 PM)' },
];

async function fetchCompanies() {
  loading.value = true;
  try {
    const response = await getCompaniesApi({ page_size: 100 });
    companies.value = response.results || [];
    if (companies.value.length > 0 && !selectedCompanyId.value) {
      // Select HQ company by default, or first company
      const hqCompany = companies.value.find((c) => c.hq);
      selectCompany(hqCompany || companies.value[0]!);
    }
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    message.error('Failed to load company information');
  } finally {
    loading.value = false;
  }
}

function selectCompany(company: BaseApi.Company) {
  selectedCompanyId.value = company.id;
  Object.assign(formState, {
    company: company.company,
    date_format: company.date_format || 'YYYY-MM-DD',
    time_format: company.time_format || 'HH:mm:ss',
    hq: company.hq,
  });
}

async function handleSave() {
  if (!formState.company) {
    message.error('Please enter a company name');
    return;
  }

  if (!selectedCompanyId.value) {
    message.error('No company selected');
    return;
  }

  submitting.value = true;
  try {
    await updateCompanyApi(selectedCompanyId.value, {
      company: formState.company,
      date_format: formState.date_format,
      time_format: formState.time_format,
      hq: formState.hq,
    });
    message.success('Company settings saved successfully');
    fetchCompanies();
  } catch (error) {
    console.error('Failed to save company settings:', error);
    message.error('Failed to save company settings');
  } finally {
    submitting.value = false;
  }
}

function getSelectedCompany(): BaseApi.Company | undefined {
  return companies.value.find((c) => c.id === selectedCompanyId.value);
}

onMounted(() => {
  fetchCompanies();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">
        {{ 'Company Settings' }}
      </h1>

      <Spin :spinning="loading">
        <Row :gutter="[24, 24]">
          <!-- Company Selector (if multiple companies) -->
          <Col v-if="companies.length > 1" :span="24">
            <Card title="Select Company">
              <div class="flex flex-wrap gap-4">
                <div
                  v-for="company in companies"
                  :key="company.id"
                  class="cursor-pointer rounded-lg border-2 p-4 transition-all"
                  :class="
                    selectedCompanyId === company.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  "
                  @click="selectCompany(company)"
                >
                  <div class="flex items-center gap-3">
                    <Avatar :size="40" :src="company.logo_url || undefined">
                      {{ company.company?.charAt(0) }}
                    </Avatar>
                    <div>
                      <div class="font-medium">{{ company.company }}</div>
                      <Tag v-if="company.hq" color="gold" size="small">HQ</Tag>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <!-- Company Details -->
          <Col :xs="24" :lg="16">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <BankOutlined />
                  <span>Company Information</span>
                </div>
              </template>
              <template #extra>
                <Button @click="fetchCompanies">
                  <template #icon>
                    <ReloadOutlined />
                  </template>
                </Button>
              </template>

              <Form layout="vertical" :model="formState">
                <div class="mb-6 flex items-center gap-6">
                  <Avatar :size="80" :src="getSelectedCompany()?.logo_url || ''">
                    {{ formState.company?.charAt(0) || 'C' }}
                  </Avatar>
                  <div>
                    <div class="text-lg font-semibold">
                      {{ formState.company || 'Company Name' }}
                    </div>
                    <Tag v-if="formState.hq" color="gold">Headquarters</Tag>
                    <Tag v-else color="blue">Branch</Tag>
                  </div>
                </div>

                <Form.Item label="Company Name" required>
                  <Input
                    v-model:value="formState.company"
                    placeholder="Enter company name"
                  >
                    <template #prefix>
                      <BankOutlined />
                    </template>
                  </Input>
                </Form.Item>

                <Row :gutter="16">
                  <Col :xs="24" :sm="12">
                    <Form.Item label="Date Format">
                      <Select
                        v-model:value="formState.date_format"
                        :options="dateFormatOptions"
                      >
                        <template #suffixIcon>
                          <CalendarOutlined />
                        </template>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col :xs="24" :sm="12">
                    <Form.Item label="Time Format">
                      <Select
                        v-model:value="formState.time_format"
                        :options="timeFormatOptions"
                      >
                        <template #suffixIcon>
                          <ClockCircleOutlined />
                        </template>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Headquarters">
                  <Switch v-model:checked="formState.hq" />
                  <span class="ml-2 text-gray-500">
                    Mark this as the headquarters location
                  </span>
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    :loading="submitting"
                    @click="handleSave"
                  >
                    <template #icon>
                      <SaveOutlined />
                    </template>
                    Save Settings
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <!-- Quick Info Panel -->
          <Col :xs="24" :lg="8">
            <Card>
              <template #title>
                <div class="flex items-center gap-2">
                  <GlobalOutlined />
                  <span>Company Overview</span>
                </div>
              </template>

              <Descriptions :column="1" size="small" bordered>
                <Descriptions.Item label="Company ID">
                  {{ selectedCompanyId || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="Name">
                  {{ formState.company || '-' }}
                </Descriptions.Item>
                <Descriptions.Item label="Date Format">
                  {{ formState.date_format }}
                </Descriptions.Item>
                <Descriptions.Item label="Time Format">
                  {{ formState.time_format }}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Tag :color="formState.hq ? 'gold' : 'blue'">
                    {{ formState.hq ? 'Headquarters' : 'Branch' }}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              <div class="mt-4">
                <div class="mb-2 text-sm text-gray-500">Format Preview</div>
                <Card size="small" class="bg-gray-50">
                  <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-500">Date:</span>
                      <span class="font-mono">{{ formState.date_format }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-500">Time:</span>
                      <span class="font-mono">{{ formState.time_format }}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>

            <!-- All Companies Summary -->
            <Card v-if="companies.length > 0" class="mt-4" title="All Companies">
              <div class="space-y-2">
                <div
                  v-for="company in companies"
                  :key="company.id"
                  class="flex items-center justify-between rounded border p-2"
                  :class="
                    selectedCompanyId === company.id
                      ? 'border-blue-300 bg-blue-50'
                      : ''
                  "
                >
                  <div class="flex items-center gap-2">
                    <Avatar :size="24" :src="company.logo_url || undefined">
                      {{ company.company?.charAt(0) }}
                    </Avatar>
                    <span class="text-sm">{{ company.company }}</span>
                  </div>
                  <Tag v-if="company.hq" color="gold" size="small">HQ</Tag>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  </Page>
</template>
