<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Row,
  Select,
  Spin,
  Switch,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  BankOutlined,
  BranchesOutlined,
  GlobalOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';

import {
  type BaseApi,
  createCompanyApi,
  getCompaniesApi,
  getCompanyApi,
  updateCompanyApi,
} from '#/api/base';

defineOptions({
  name: 'CompanyForm',
});

const route = useRoute();
const router = useRouter();

const companyId = computed(() =>
  route.params.id ? Number(route.params.id) : null,
);
const parentId = computed(() =>
  route.query.parent ? Number(route.query.parent) : null,
);
const isEditing = computed(() => !!companyId.value);
const pageTitle = computed(() =>
  isEditing.value ? 'Edit Company' : 'Create Company',
);

const loading = ref(false);
const submitting = ref(false);
const companies = ref<BaseApi.Company[]>([]);

const formState = reactive<BaseApi.CompanyParams>({
  name: '',
  code: '',
  description: '',
  is_headquarters: false,
  parent_company_id: null,
  address: '',
  country: '',
  state: '',
  city: '',
  zip_code: '',
  phone: '',
  email: '',
  website: '',
  tax_id: '',
  registration_number: '',
  date_format: 'YYYY-MM-DD',
  time_format: 'HH:mm:ss',
  timezone: 'UTC',
  currency: 'USD',
  is_active: true,
});

const formRules: Record<string, any> = {
  name: [{ required: true, message: 'Please enter company name' }],
  code: [{ required: true, message: 'Please enter company code' }],
  address: [{ required: true, message: 'Please enter address' }],
  country: [{ required: true, message: 'Please enter country' }],
  state: [{ required: true, message: 'Please enter state' }],
  city: [{ required: true, message: 'Please enter city' }],
  zip_code: [{ required: true, message: 'Please enter zip code' }],
  email: [{ type: 'email', message: 'Please enter a valid email' }],
};

// Parent company options (exclude self and descendants when editing)
const parentCompanyOptions = computed(() => {
  return companies.value
    .filter((c) => {
      // Can't be its own parent
      if (companyId.value && c.id === companyId.value) return false;
      // Can't select a child as parent (circular reference)
      if (companyId.value && isDescendant(c, companyId.value)) return false;
      return true;
    })
    .map((c) => ({
      value: c.id,
      label: c.name + (c.is_headquarters ? ' (HQ)' : c.parent_company_id ? ' (Branch)' : ''),
    }));
});

function isDescendant(company: BaseApi.Company, parentId: number): boolean {
  if (company.parent_company_id === parentId) return true;
  const parent = companies.value.find((c) => c.id === company.parent_company_id);
  if (parent) return isDescendant(parent, parentId);
  return false;
}

const dateFormatOptions = [
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-15)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (15/01/2024)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/15/2024)' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY (15-01-2024)' },
];

const timeFormatOptions = [
  { value: 'HH:mm:ss', label: '24-hour (14:30:00)' },
  { value: 'HH:mm', label: '24-hour short (14:30)' },
  { value: 'hh:mm A', label: '12-hour (02:30 PM)' },
];

async function fetchCompanies() {
  try {
    const response = await getCompaniesApi({ page_size: 100 });
    // Support both response formats
    companies.value = response.items || response.results || [];
  } catch (error) {
    console.error('Failed to fetch companies:', error);
  }
}

async function fetchCompany() {
  if (!companyId.value) return;

  loading.value = true;
  try {
    const company = await getCompanyApi(companyId.value);
    Object.assign(formState, {
      name: company.name,
      code: company.code,
      description: company.description || '',
      is_headquarters: company.is_headquarters,
      parent_company_id: company.parent_company_id,
      address: company.address || '',
      country: company.country || '',
      state: company.state || '',
      city: company.city || '',
      zip_code: company.zip_code || '',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || '',
      tax_id: company.tax_id || '',
      registration_number: company.registration_number || '',
      date_format: company.date_format || 'YYYY-MM-DD',
      time_format: company.time_format || 'HH:mm:ss',
      timezone: company.timezone || 'UTC',
      currency: company.currency || 'USD',
      is_active: company.is_active,
    });
  } catch (error) {
    console.error('Failed to fetch company:', error);
    message.error('Failed to load company');
    router.push('/settings/companies');
  } finally {
    loading.value = false;
  }
}

async function handleSubmit() {
  submitting.value = true;
  try {
    if (isEditing.value) {
      await updateCompanyApi(companyId.value!, formState);
      message.success('Company updated successfully');
    } else {
      await createCompanyApi(formState);
      message.success('Company created successfully');
    }
    router.push('/settings/companies');
  } catch (error: any) {
    console.error('Failed to save company:', error);
    const errorMsg =
      error.response?.data?.error ||
      Object.values(error.response?.data || {}).flat().join(', ') ||
      'Failed to save company';
    message.error(errorMsg);
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  router.push('/settings/companies');
}

onMounted(async () => {
  await fetchCompanies();
  if (isEditing.value) {
    await fetchCompany();
  } else if (parentId.value) {
    // Pre-select parent when creating a branch
    formState.parent_company_id = parentId.value;
  }
});
</script>

<template>
  <Page auto-content-height>
    <div class="mx-auto max-w-4xl p-4">
      <!-- Header -->
      <div class="mb-6">
        <Button type="text" class="mb-2" @click="handleCancel">
          <template #icon>
            <ArrowLeftOutlined />
          </template>
          Back to Companies
        </Button>
        <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
        <p class="text-gray-500">
          {{
            isEditing
              ? 'Update company information'
              : parentId
                ? 'Create a new branch under parent company'
                : 'Add a new company to your organization'
          }}
        </p>
      </div>

      <Spin :spinning="loading">
        <Form
          :model="formState"
          :rules="formRules"
          layout="vertical"
          @finish="handleSubmit"
        >
          <!-- Basic Information -->
          <Card class="mb-4">
            <template #title>
              <div class="flex items-center gap-2">
                <BankOutlined />
                <span>Basic Information</span>
              </div>
            </template>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="Company Name" name="name" required>
                  <Input
                    v-model:value="formState.name"
                    placeholder="Enter company name"
                  >
                    <template #prefix>
                      <BankOutlined />
                    </template>
                  </Input>
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="Company Code" name="code" required>
                  <Input
                    v-model:value="formState.code"
                    placeholder="Enter company code (e.g., ACME)"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :xs="24" :sm="8">
                <Form.Item label="Headquarters">
                  <Switch
                    v-model:checked="formState.is_headquarters"
                    :disabled="!!formState.parent_company_id"
                  />
                  <span class="ml-2 text-gray-500">
                    {{ formState.is_headquarters ? 'Yes' : 'No' }}
                  </span>
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="8">
                <Form.Item label="Parent Company" name="parent_company_id">
                  <Select
                    v-model:value="(formState as any).parent_company_id"
                    placeholder="Select parent company (optional)"
                    :options="parentCompanyOptions"
                    allow-clear
                    show-search
                    :filter-option="
                      (input, option) =>
                        option?.label
                          ?.toLowerCase()
                          .includes(input.toLowerCase())
                    "
                    @change="
                      () => {
                        if (formState.parent_company_id) formState.is_headquarters = false;
                      }
                    "
                  >
                    <template #suffixIcon>
                      <BranchesOutlined />
                    </template>
                  </Select>
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="8">
                <Form.Item label="Status">
                  <Switch v-model:checked="formState.is_active" />
                  <span class="ml-2">
                    {{ formState.is_active ? 'Active' : 'Inactive' }}
                  </span>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <!-- Address -->
          <Card class="mb-4">
            <template #title>
              <div class="flex items-center gap-2">
                <GlobalOutlined />
                <span>Address</span>
              </div>
            </template>

            <Form.Item label="Address" name="address" required>
              <Input.TextArea
                v-model:value="formState.address"
                placeholder="Enter street address"
                :rows="2"
              />
            </Form.Item>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="Country" name="country" required>
                  <Input
                    v-model:value="formState.country"
                    placeholder="Enter country"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="State/Province" name="state" required>
                  <Input
                    v-model:value="formState.state"
                    placeholder="Enter state or province"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="City" name="city" required>
                  <Input
                    v-model:value="formState.city"
                    placeholder="Enter city"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="Zip/Postal Code" name="zip_code" required>
                  <Input
                    v-model:value="formState.zip_code"
                    placeholder="Enter zip code"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <!-- Contact Information -->
          <Card class="mb-4">
            <template #title>
              <div class="flex items-center gap-2">
                <PhoneOutlined />
                <span>Contact Information</span>
              </div>
            </template>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="Phone" name="phone">
                  <Input
                    v-model:value="formState.phone"
                    placeholder="Enter phone number"
                  >
                    <template #prefix>
                      <PhoneOutlined />
                    </template>
                  </Input>
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="Email" name="email">
                  <Input
                    v-model:value="formState.email"
                    type="email"
                    placeholder="Enter email address"
                  >
                    <template #prefix>
                      <MailOutlined />
                    </template>
                  </Input>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Website" name="website">
              <Input
                v-model:value="formState.website"
                placeholder="https://example.com"
              >
                <template #prefix>
                  <GlobalOutlined />
                </template>
              </Input>
            </Form.Item>
          </Card>

          <!-- Registration Details -->
          <Card class="mb-4">
            <template #title>
              <span>Registration Details</span>
            </template>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="Tax ID" name="tax_id">
                  <Input
                    v-model:value="formState.tax_id"
                    placeholder="Enter tax identification number"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="Registration Number" name="registration_number">
                  <Input
                    v-model:value="formState.registration_number"
                    placeholder="Enter company registration number"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <!-- Format Settings -->
          <Card class="mb-4">
            <template #title>
              <span>Format Settings</span>
            </template>

            <Row :gutter="16">
              <Col :xs="24" :sm="12">
                <Form.Item label="Date Format" name="date_format">
                  <Select
                    v-model:value="formState.date_format"
                    :options="dateFormatOptions"
                  />
                </Form.Item>
              </Col>
              <Col :xs="24" :sm="12">
                <Form.Item label="Time Format" name="time_format">
                  <Select
                    v-model:value="formState.time_format"
                    :options="timeFormatOptions"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <!-- Actions -->
          <div class="flex justify-end gap-3">
            <Button @click="handleCancel">Cancel</Button>
            <Button type="primary" html-type="submit" :loading="submitting">
              <template #icon>
                <SaveOutlined />
              </template>
              {{ isEditing ? 'Update Company' : 'Create Company' }}
            </Button>
          </div>
        </Form>
      </Spin>
    </div>
  </Page>
</template>
