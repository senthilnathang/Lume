<template>
  <div class="activities-view">
    <div class="page-header">
      <h1>Activities</h1>
      <p class="subtitle">Track all system activities and events</p>
    </div>
    <div class="activity-timeline">
      <div v-for="activity in activities" :key="activity.id" class="activity-item">
        <div class="activity-icon" :class="activity.type">
          <svg v-if="activity.type === 'user'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <svg v-else-if="activity.type === 'donation'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <div class="activity-content">
          <div class="activity-header">
            <span class="activity-user">{{ activity.user }}</span>
            <span class="activity-action">{{ activity.action }}</span>
          </div>
          <p class="activity-description">{{ activity.description }}</p>
          <span class="activity-time">{{ formatDate(activity.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const activities = ref([
  { id: 1, type: 'user', user: 'Sarah Johnson', action: 'logged in', description: 'User logged in from 192.168.1.100', created_at: '2024-01-15T10:30:00' },
  { id: 2, type: 'donation', user: 'John Smith', action: 'made a donation', description: 'Donation of $500 to Annual Fund 2024', created_at: '2024-01-15T10:15:00' },
  { id: 3, type: 'document', user: 'Michael Chen', action: 'uploaded document', description: 'Uploaded Annual Report 2024.pdf (2.4 MB)', created_at: '2024-01-15T09:45:00' },
  { id: 4, type: 'user', user: 'Emily Davis', action: 'created campaign', description: 'Created new campaign: Spring Fundraiser 2024', created_at: '2024-01-15T09:00:00' },
  { id: 5, type: 'system', user: 'System', action: 'backed up database', description: 'Automated database backup completed successfully', created_at: '2024-01-15T08:00:00' }
]);

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', { 
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
  });
};
</script>

<style scoped>
.activities-view { padding: 24px; max-width: 900px; margin: 0 auto; }
.page-header { margin-bottom: 32px; }
.page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
.subtitle { color: #64748b; margin: 0; }
.activity-timeline { position: relative; padding-left: 24px; }
.activity-timeline::before { content: ''; position: absolute; left: 31px; top: 0; bottom: 0; width: 2px; background: #e5e7eb; }
.activity-item { position: relative; display: flex; gap: 16px; padding-bottom: 24px; }
.activity-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; z-index: 1; }
.activity-icon.user { background: #dbeafe; color: #2563eb; }
.activity-icon.donation { background: #dcfce7; color: #16a34a; }
.activity-icon.document { background: #fef3c7; color: #d97706; }
.activity-icon.system { background: #f3e8ff; color: #9333ea; }
.activity-content { flex: 1; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.activity-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.activity-user { font-weight: 600; color: #1a1a2e; }
.activity-action { color: #6b7280; }
.activity-description { font-size: 14px; color: #374151; margin: 0 0 8px 0; }
.activity-time { font-size: 12px; color: #9ca3af; }
</style>
