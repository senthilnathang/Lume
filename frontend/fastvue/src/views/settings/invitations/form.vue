<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Button,
  Card,
  Col,
  Form,
  FormItem,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Textarea,
} from 'ant-design-vue';
import {
  ArrowLeftOutlined,
  MailOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';

import { createInvitationApi, type InvitationApi } from '#/api/invitation';
import { getRolesApi, type RolesApi } from '#/api/roles';

defineOptions({
  name: 'InvitationForm',
});

const router = useRouter();
const userStore = useUserStore();

// Form state
const formState = reactive<InvitationApi.CreateInvitationParams>({
  email: '',
  company_id: 0,
  role_id: undefined,
  group_ids: undefined,
  message: '',
  expiry_hours: 48,
});

// Loading states
const loading = ref(false);
const rolesLoading = ref(false);

// Roles list
const roles = ref<RolesApi.Role[]>([]);

// Form rules
const rules: Record<string, any[]> = {
  email: [
    { required: true, message: 'Please enter an email address' },
    { type: 'email', message: 'Please enter a valid email address' },
  ],
  expiry_hours: [
    { required: true, message: 'Please specify expiry hours' },
  ],
};

// Computed
const currentCompanyId = computed(() => userStore.userInfo?.currentCompanyId || 0);

const roleOptions = computed(() =>
  roles.value.map((role) => ({
    value: role.id,
    label: role.name,
  }))
);

// Methods
async function fetchRoles() {
  rolesLoading.value = true;
  try {
    const response = await getRolesApi({ is_active: true, page_size: 100 });
    roles.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch roles:', error);
    message.error('Failed to load roles');
  } finally {
    rolesLoading.value = false;
  }
}

async function handleSubmit() {
  loading.value = true;
  try {
    const data: InvitationApi.CreateInvitationParams = {
      email: formState.email,
      company_id: currentCompanyId.value,
      role_id: formState.role_id || undefined,
      message: formState.message || undefined,
      expiry_hours: formState.expiry_hours,
    };

    await createInvitationApi(data);
    message.success('Invitation sent successfully!');
    router.push({ name: 'Invitations' });
  } catch (error: any) {
    console.error('Failed to send invitation:', error);
    const errorMessage = error?.response?.data?.detail || 'Failed to send invitation';
    message.error(errorMessage);
  } finally {
    loading.value = false;
  }
}

function handleCancel() {
  router.push({ name: 'Invitations' });
}

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <Page auto-content-height>
    <div class="invitation-form-page p-4">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <Button @click="handleCancel">
          <template #icon><ArrowLeftOutlined /></template>
        </Button>
        <div>
          <h1 class="text-2xl font-bold mb-1">Send Invitation</h1>
          <p class="text-gray-500">Invite a new user to join your organization</p>
        </div>
      </div>

      <!-- Form Card -->
      <Card>
        <Form
          :model="formState"
          :rules="rules"
          layout="vertical"
          @finish="handleSubmit"
        >
          <Row :gutter="24">
            <Col :xs="24" :md="12">
              <FormItem label="Email Address" name="email" required>
                <Input
                  v-model:value="formState.email"
                  placeholder="user@example.com"
                  size="large"
                >
                  <template #prefix>
                    <MailOutlined />
                  </template>
                </Input>
              </FormItem>
            </Col>

            <Col :xs="24" :md="12">
              <FormItem label="Role" name="role_id">
                <Select
                  v-model:value="formState.role_id"
                  placeholder="Select a role (optional)"
                  :options="roleOptions"
                  :loading="rolesLoading"
                  allow-clear
                  size="large"
                />
              </FormItem>
            </Col>

            <Col :xs="24" :md="12">
              <FormItem label="Expiry Hours" name="expiry_hours" required>
                <InputNumber
                  v-model:value="formState.expiry_hours"
                  :min="1"
                  :max="720"
                  style="width: 100%"
                  size="large"
                >
                  <template #addonAfter>hours</template>
                </InputNumber>
                <div class="text-gray-400 text-sm mt-1">
                  Invitation will expire after this many hours (max 30 days)
                </div>
              </FormItem>
            </Col>

            <Col :xs="24">
              <FormItem label="Personal Message" name="message">
                <Textarea
                  v-model:value="formState.message"
                  placeholder="Add a personal message to the invitation (optional)"
                  :rows="4"
                  :maxlength="1000"
                  show-count
                />
              </FormItem>
            </Col>
          </Row>

          <!-- Actions -->
          <div class="flex gap-4 mt-6">
            <Button
              type="primary"
              html-type="submit"
              :loading="loading"
              size="large"
            >
              <template #icon><SendOutlined /></template>
              Send Invitation
            </Button>
            <Button size="large" @click="handleCancel">
              Cancel
            </Button>
          </div>
        </Form>
      </Card>

      <!-- Info Card -->
      <Card class="mt-6">
        <h3 class="font-semibold mb-2">What happens next?</h3>
        <ul class="list-disc list-inside text-gray-600 space-y-1">
          <li>The user will receive an email invitation</li>
          <li>They can click the link to create their account</li>
          <li>You'll be notified when they accept the invitation</li>
          <li>You can resend or cancel the invitation from the list</li>
        </ul>
      </Card>
    </div>
  </Page>
</template>

<style scoped>
.invitation-form-page {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  max-width: 900px;
}
</style>
