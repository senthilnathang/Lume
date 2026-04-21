<template>
  <div class="dashboard-page">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <p>Welcome to Lume Framework</p>
    </div>
    
    <div class="dashboard-stats">
      <div class="stat-card">
        <div class="stat-icon users">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.users || 0 }}</span>
          <span class="stat-label">Total Users</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon donations">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">${{ stats.donations?.toLocaleString() || '0' }}</span>
          <span class="stat-label">Total Donations</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon activities">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.activities || 0 }}</span>
          <span class="stat-label">Activities</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon documents">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stats.documents || 0 }}</span>
          <span class="stat-label">Documents</span>
        </div>
      </div>
    </div>
    
    <div class="dashboard-content">
      <div class="dashboard-card">
        <h3>Recent Activity</h3>
        <p class="empty-state">No recent activity</p>
      </div>
      
      <div class="dashboard-card">
        <h3>Quick Actions</h3>
        <div class="quick-actions">
          <button class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
            New Activity
          </button>
          <button class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Upload Document
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { get } from '@/api/request';

const stats = reactive({
  users: 0,
  donations: 0,
  activities: 0,
  documents: 0,
});

const loadStats = async () => {
  try {
    const response = await get<{ stats: any }>('/dashboard/stats');
    if (response && response.stats) {
      stats.users = response.stats.users || 0;
      stats.donations = response.stats.donations || 0;
      stats.activities = response.stats.activities || 0;
      stats.documents = response.stats.documents || 0;
    }
  } catch (error) {
    console.log('Dashboard stats not available');
  }
};

onMounted(() => {
  loadStats();
});
</script>

<style scoped>
.dashboard-page {
  padding: 24px;
}

.dashboard-header {
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 4px 0;
}

.dashboard-header p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e5e7eb;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.users {
  background: #eef2ff;
  color: #4f46e5;
}

.stat-icon.donations {
  background: #ecfdf5;
  color: #22c55e;
}

.stat-icon.activities {
  background: #fef3c7;
  color: #f59e0b;
}

.stat-icon.documents {
  background: #f3e8ff;
  color: #a855f7;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.stat-label {
  font-size: 13px;
  color: #6b7280;
}

.dashboard-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

@media (max-width: 1024px) {
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #e5e7eb;
}

.dashboard-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
}

.empty-state {
  color: #9ca3af;
  text-align: center;
  padding: 32px;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.action-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}
</style>
