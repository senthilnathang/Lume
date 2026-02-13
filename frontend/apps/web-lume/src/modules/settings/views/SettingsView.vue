<template>
  <div class="settings-view">
    <div class="page-header">
      <h1>Settings</h1>
      <p class="subtitle">Manage your application settings</p>
    </div>
    <div class="settings-grid">
      <div class="settings-section">
        <h2>General Settings</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Application Name</label>
            <p>The name displayed in the browser tab and header</p>
          </div>
          <input type="text" v-model="settings.appName" class="setting-input" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Support Email</label>
            <p>Email address for user support</p>
          </div>
          <input type="email" v-model="settings.supportEmail" class="setting-input" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Timezone</label>
            <p>Default timezone for date displays</p>
          </div>
          <select v-model="settings.timezone" class="setting-input">
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
          </select>
        </div>
      </div>
      <div class="settings-section">
        <h2>Notifications</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Email Notifications</label>
            <p>Receive email notifications for important updates</p>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.emailNotifications" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Donation Alerts</label>
            <p>Get notified when new donations are received</p>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.donationAlerts" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <div class="settings-section">
        <h2>Security</h2>
        <div class="setting-item">
          <div class="setting-info">
            <label>Two-Factor Authentication</label>
            <p>Require 2FA for all admin accounts</p>
          </div>
          <label class="toggle">
            <input type="checkbox" v-model="settings.twoFactorAuth" />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label>Session Timeout</label>
            <p>Auto logout after inactivity (minutes)</p>
          </div>
          <input type="number" v-model="settings.sessionTimeout" class="setting-input small" />
        </div>
      </div>
    </div>
    <div class="settings-footer">
      <button class="save-btn" @click="saveSettings">Save Changes</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const settings = ref({
  appName: 'Gawdesy',
  supportEmail: 'support@gawdesy.org',
  timezone: 'UTC',
  emailNotifications: true,
  donationAlerts: true,
  twoFactorAuth: false,
  sessionTimeout: 30
});

const saveSettings = () => {
  console.log('Saving settings:', settings.value);
  alert('Settings saved successfully!');
};
</script>

<style scoped>
.settings-view { padding: 24px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 32px; }
.page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
.subtitle { color: #64748b; margin: 0; }
.settings-grid { display: flex; flex-direction: column; gap: 24px; }
.settings-section { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.settings-section h2 { font-size: 18px; font-weight: 600; color: #1a1a2e; margin: 0 0 20px 0; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
.setting-item { display: flex; justify-content: space-between; align-items: center; padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
.setting-item:last-child { border-bottom: none; padding-bottom: 0; }
.setting-info label { font-weight: 500; color: #1a1a2e; display: block; margin-bottom: 4px; }
.setting-info p { font-size: 13px; color: #6b7280; margin: 0; }
.setting-input { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; min-width: 250px; }
.setting-input:focus { outline: none; border-color: #4f46e5; }
.setting-input.small { width: 100px; }
.toggle { position: relative; display: inline-block; width: 48px; height: 26px; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; inset: 0; background: #e2e8f0; border-radius: 26px; transition: 0.3s; }
.toggle-slider::before { content: ''; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
.toggle input:checked + .toggle-slider { background: #4f46e5; }
.toggle input:checked + .toggle-slider::before { transform: translateX(22px); }
.settings-footer { margin-top: 24px; display: flex; justify-content: flex-end; }
.save-btn { padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.save-btn:hover { background: #4338ca; }
</style>
