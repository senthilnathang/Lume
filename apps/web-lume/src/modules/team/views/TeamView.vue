<template>
  <div class="team-view">
    <div class="page-header">
      <div class="header-content">
        <h1>Team</h1>
        <p class="subtitle">Manage your team members</p>
      </div>
      <div class="header-actions">
        <button @click="showAddModal = true" class="add-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Team Member
        </button>
      </div>
    </div>

    <div class="team-grid">
      <div v-for="member in team" :key="member.id" class="team-card">
        <div class="member-avatar">
          {{ getInitials(member.name) }}
        </div>
        <div class="member-info">
          <h3>{{ member.name }}</h3>
          <p class="role">{{ member.position }}</p>
          <p class="email">{{ member.email }}</p>
          <span class="status" :class="member.status">{{ member.status }}</span>
        </div>
        <div class="member-actions">
          <button @click="editMember(member)" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button @click="deleteMember(member)" class="action-btn delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const showAddModal = ref(false);
const team = ref([
  { id: 1, name: 'Sarah Johnson', position: 'Executive Director', email: 'sarah@gawdesy.org', status: 'active' },
  { id: 2, name: 'Michael Chen', position: 'Program Manager', email: 'michael@gawdesy.org', status: 'active' },
  { id: 3, name: 'Emily Davis', position: 'Fundraiser Coordinator', email: 'emily@gawdesy.org', status: 'active' },
  { id: 4, name: 'James Wilson', position: 'Volunteer Lead', email: 'james@gawdesy.org', status: 'inactive' }
]);

const getInitials = (name) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const editMember = (member) => {
  console.log('Edit:', member);
};

const deleteMember = (member) => {
  if (confirm(`Remove ${member.name} from team?`)) {
    team.value = team.value.filter(m => m.id !== member.id);
  }
};
</script>

<style scoped>
.team-view {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.subtitle {
  color: #64748b;
  margin-top: 4px;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.add-btn:hover {
  background: #4338ca;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.team-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.member-avatar {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
  margin: 0 auto 16px;
}

.member-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px 0;
}

.member-info .role {
  font-size: 14px;
  color: #4f46e5;
  margin: 0 0 4px 0;
  font-weight: 500;
}

.member-info .email {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 12px 0;
}

.status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status.active {
  background: #dcfce7;
  color: #166534;
}

.status.inactive {
  background: #f3f4f6;
  color: #6b7280;
}

.member-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #6b7280;
  cursor: pointer;
}

.action-btn:hover {
  background: #f3f4f6;
}

.action-btn.delete:hover {
  color: #ef4444;
  border-color: #ef4444;
}
</style>
