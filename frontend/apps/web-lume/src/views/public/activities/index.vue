<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

interface Activity {
  id: number;
  title: string;
  description: string;
  activity_date: string;
  location: string;
  images: string[];
  programme?: { title: string; icon: string; color: string };
}

const activities = ref<Activity[]>([]);
const loading = ref(true);
const pagination = ref({ page: 1, pages: 1, total: 0 });

onMounted(async () => {
  await fetchActivities();
});

const fetchActivities = async (page = 1) => {
  loading.value = true;
  try {
    const data = await api.get('/public/activities', { params: { page, limit: 12 } });
    activities.value = data.activities || [];
    pagination.value = data.pagination || { page: 1, pages: 1, total: 0 };
  } catch (error) {
    console.error('Failed to fetch activities:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="activities-page">
    <Header />

    <section class="page-header">
      <div class="container">
        <h1>Our Activities</h1>
        <p>Highlights from our community initiatives and events</p>
      </div>
    </section>

    <section class="breadcrumb-section">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">Home</router-link>
          <span>/</span>
          <span>Activities</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else class="activities-grid">
          <div v-for="activity in activities" :key="activity.id" class="activity-card">
            <div class="activity-image">
              <div class="image-placeholder">
                <span>{{ activity.programme?.icon || '📷' }}</span>
              </div>
              <span class="activity-badge" :style="{ background: activity.programme?.color || '#2E7D32' }">
                {{ activity.programme?.title || 'Activity' }}
              </span>
            </div>
            <div class="activity-content">
              <div class="activity-meta">
                <span class="date">📅 {{ activity.activity_date }}</span>
                <span class="location">📍 {{ activity.location }}</span>
              </div>
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.description?.slice(0, 150) }}...</p>
              <button class="btn btn-outline btn-sm">View Details</button>
            </div>
          </div>
        </div>

        <div v-if="pagination.pages > 1" class="pagination">
          <button 
            :disabled="pagination.page === 1" 
            @click="fetchActivities(pagination.page - 1)"
            class="btn btn-outline"
          >
            Previous
          </button>
          <span>Page {{ pagination.page }} of {{ pagination.pages }}</span>
          <button 
            :disabled="pagination.page === pagination.pages" 
            @click="fetchActivities(pagination.page + 1)"
            class="btn btn-outline"
          >
            Next
          </button>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.activities-page { min-height: 100vh; }

.breadcrumb-section { background: white; padding: 12px 0; }

.loading-state {
  text-align: center;
  padding: 80px 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.activities-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}

.activity-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all 0.3s ease;
}

.activity-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.activity-image {
  position: relative;
  height: 200px;
}

.image-placeholder {
  height: 100%;
  background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary-color) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 56px;
}

.activity-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: white;
  font-weight: 500;
}

.activity-content { padding: 24px; }

.activity-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.activity-content h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.activity-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-top: 48px;
}

.pagination span { color: var(--text-secondary); }

@media (max-width: 1024px) {
  .activities-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .activities-grid { grid-template-columns: 1fr; }
}
</style>
