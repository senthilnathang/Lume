<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  Select,
  SelectOption,
  Tabs,
  TabPane,
  Avatar,
  Descriptions,
  DescriptionsItem,
  Divider,
  message,
  Spin,
  Row,
  Col,
  Switch,
  Upload,
} from 'ant-design-vue';

import {
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  LockOutlined,
  BellOutlined,
  SafetyOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'UserProfile',
});

const loading = ref(false);
const route = useRoute();
const userId = ref(route.query.id ? parseInt(route.query.id) : 1);

const user = ref({
  id: userId.value,
  name: 'Admin User',
  email: 'admin@gawdesy.org',
  role: 'Administrator',
  status: 'active',
  phone: '+1 234 567 890',
  department: 'IT',
  title: 'System Administrator',
  avatar: null,
  createdAt: '2026-01-01',
  lastLogin: '2026-02-13 10:30',
});

const profileForm = ref({
  name: user.value.name,
  email: user.value.email,
  phone: user.value.phone,
  department: user.value.department,
  title: user.value.title,
});

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const preferences = ref({
  emailNotifications: true,
  pushNotifications: true,
  weeklyDigest: false,
  twoFactorAuth: false,
});

const activeTab = ref('profile');

function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

async function loadUser() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
  } catch (error) {
    message.error('Failed to load user');
  } finally {
    loading.value = false;
  }
}

async function saveProfile() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
    message.success('Profile updated successfully');
  } catch (error) {
    message.error('Failed to update profile');
  } finally {
    loading.value = false;
  }
}

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    message.error('Passwords do not match');
    return;
  }
  
  if (passwordForm.value.newPassword.length < 8) {
    message.error('Password must be at least 8 characters');
    return;
  }
  
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
    message.success('Password changed successfully');
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' };
  } catch (error) {
    message.error('Failed to change password');
  } finally {
    loading.value = false;
  }
}

async function savePreferences() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
    message.success('Preferences saved successfully');
  } catch (error) {
    message.error('Failed to save preferences');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadUser();
});
</script>

<template>
  <Page title="User Profile" :description="user.name">
    <Spin :spinning="loading">
      <Row :gutter="24">
        <Col :xs="24" :lg="6">
          <Card class="profile-card">
            <div class="text-center">
              <Avatar :size="120" :src="user.avatar" :style="{ backgroundColor: '#1890ff', fontSize: '48px' }">
                {{ getInitials(user.name) }}
              </Avatar>
              <h2 class="mt-4 mb-1">{{ user.name }}</h2>
              <p class="text-gray-500 mb-4">{{ user.title }}</p>
              <Tag :color="user.status === 'active' ? 'green' : 'default'">
                {{ user.status }}
              </Tag>
            </div>
            
            <Divider />
            
            <Descriptions :column="1" size="small">
              <DescriptionsItem label="Email">
                <MailOutlined class="mr-2" />
                {{ user.email }}
              </DescriptionsItem>
              <DescriptionsItem label="Department">
                {{ user.department }}
              </DescriptionsItem>
              <DescriptionsItem label="Role">
                {{ user.role }}
              </DescriptionsItem>
              <DescriptionsItem label="Last Login">
                {{ user.lastLogin }}
              </DescriptionsItem>
              <DescriptionsItem label="Member Since">
                {{ user.createdAt }}
              </DescriptionsItem>
            </Descriptions>
          </Card>
        </Col>
        
        <Col :xs="24" :lg="18">
          <Card>
            <Tabs v-model:activeKey="activeTab">
              <TabPane key="profile" tab="Profile">
                <Form layout="vertical" :model="profileForm">
                  <Row :gutter="16">
                    <Col :span="12">
                      <FormItem label="Full Name">
                        <Input v-model:value="profileForm.name" placeholder="Enter full name" />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Email">
                        <Input v-model:value="profileForm.email" placeholder="Enter email" disabled />
                      </FormItem>
                    </Col>
                  </Row>
                  <Row :gutter="16">
                    <Col :span="12">
                      <FormItem label="Phone">
                        <Input v-model:value="profileForm.phone" placeholder="Enter phone number" />
                      </FormItem>
                    </Col>
                    <Col :span="12">
                      <FormItem label="Department">
                        <Input v-model:value="profileForm.department" placeholder="Enter department" />
                      </FormItem>
                    </Col>
                  </Row>
                  <FormItem label="Job Title">
                    <Input v-model:value="profileForm.title" placeholder="Enter job title" />
                  </FormItem>
                  
                  <div class="flex justify-end">
                    <Button type="primary" @click="saveProfile">
                      <SaveOutlined />
                      Save Changes
                    </Button>
                  </div>
                </Form>
              </TabPane>
              
              <TabPane key="security" tab="Security">
                <Form layout="vertical" :model="passwordForm">
                  <h3 class="mb-4">Change Password</h3>
                  <FormItem label="Current Password">
                    <Input v-model:value="passwordForm.currentPassword" type="password" placeholder="Enter current password" />
                  </FormItem>
                  <FormItem label="New Password">
                    <Input v-model:value="passwordForm.newPassword" type="password" placeholder="Enter new password" />
                  </FormItem>
                  <FormItem label="Confirm New Password">
                    <Input v-model:value="passwordForm.confirmPassword" type="password" placeholder="Confirm new password" />
                  </FormItem>
                  
                  <div class="flex justify-end">
                    <Button type="primary" @click="changePassword">
                      <LockOutlined />
                      Change Password
                    </Button>
                  </div>
                </Form>
                
                <Divider />
                
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="mb-1">Two-Factor Authentication</h4>
                    <p class="text-gray-500 text-sm">Add an extra layer of security to your account</p>
                  </div>
                  <Switch v-model:checked="preferences.twoFactorAuth" />
                </div>
              </TabPane>
              
              <TabPane key="notifications" tab="Notifications">
                <h3 class="mb-4">Notification Preferences</h3>
                
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="mb-1">Email Notifications</h4>
                    <p class="text-gray-500 text-sm">Receive notifications via email</p>
                  </div>
                  <Switch v-model:checked="preferences.emailNotifications" />
                </div>
                
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="mb-1">Push Notifications</h4>
                    <p class="text-gray-500 text-sm">Receive push notifications in your browser</p>
                  </div>
                  <Switch v-model:checked="preferences.pushNotifications" />
                </div>
                
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="mb-1">Weekly Digest</h4>
                    <p class="text-gray-500 text-sm">Receive a weekly summary of activities</p>
                  </div>
                  <Switch v-model:checked="preferences.weeklyDigest" />
                </div>
                
                <div class="flex justify-end mt-4">
                  <Button type="primary" @click="savePreferences">
                    <BellOutlined />
                    Save Preferences
                  </Button>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </Spin>
  </Page>
</template>

<style scoped>
.profile-card {
  position: sticky;
  top: 20px;
}

.mt-4 {
  margin-top: 16px;
}

.mb-1 {
  margin-bottom: 4px;
}

.mb-4 {
  margin-bottom: 16px;
}

.text-center {
  text-align: center;
}

.text-gray-500 {
  color: #6b7280;
}

.text-sm {
  font-size: 14px;
}
</style>
