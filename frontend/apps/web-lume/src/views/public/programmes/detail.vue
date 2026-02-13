<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

const route = useRoute();
const router = useRouter();

const programme = ref<any>(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const slug = route.params.slug as string;
    const data = await api.get(`/public/programmes/${slug}`);
    programme.value = data.programme;
  } catch (err) {
    error.value = 'Programme not found';
    setTimeout(() => router.push('/programmes'), 3000);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="programme-detail-page">
    <Header />

    <section class="page-header" :style="{ background: `linear-gradient(135deg, ${programme?.color || '#2E7D32'} 0%, ${programme?.color || '#1B5E20'} 100%)` }">
      <div class="container">
        <router-link to="/programmes" class="back-link">← Back to Programmes</router-link>
        <h1>{{ programme?.title || 'Programme' }}</h1>
      </div>
    </section>

    <section v-if="loading" class="section loading-section">
      <div class="container text-center">
        <div class="spinner"></div>
        <p>Loading programme details...</p>
      </div>
    </section>

    <section v-else-if="programme" class="section">
      <div class="container">
        <div class="detail-grid">
          <div class="detail-main">
            <div class="detail-card">
              <div class="programme-header">
                <span class="programme-icon">{{ programme.icon || '📋' }}</span>
                <div>
                  <h2>{{ programme.title }}</h2>
                  <p class="programme-subtitle">Programme Details</p>
                </div>
              </div>

              <div class="detail-section">
                <h3>Description</h3>
                <p>{{ programme.description }}</p>
              </div>

              <div v-if="programme.objectives" class="detail-section">
                <h3>Objectives</h3>
                <p>{{ programme.objectives }}</p>
              </div>

              <div v-if="programme.target_beneficiaries" class="detail-section">
                <h3>Target Beneficiaries</h3>
                <p>{{ programme.target_beneficiaries }}</p>
              </div>

              <div v-if="programme.outcomes" class="detail-section">
                <h3>Expected Outcomes</h3>
                <p>{{ programme.outcomes }}</p>
              </div>
            </div>

            <div v-if="programme.activities?.length" class="activities-card">
              <h3>Related Activities</h3>
              <div class="related-activities">
                <div v-for="activity in programme.activities" :key="activity.id" class="activity-item">
                  <div class="activity-date">{{ activity.activity_date }}</div>
                  <div class="activity-info">
                    <h4>{{ activity.title }}</h4>
                    <p>{{ activity.description?.slice(0, 100) }}...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="detail-sidebar">
            <div class="sidebar-card info-card">
              <h4>Programme Info</h4>
              <div class="info-item">
                <span class="label">Status</span>
                <span class="value status-badge" :class="programme.status">{{ programme.status }}</span>
              </div>
              <div class="info-item">
                <span class="label">Category</span>
                <span class="value">{{ programme.slug }}</span>
              </div>
            </div>

            <div class="sidebar-card contact-card">
              <h4>Interested?</h4>
              <p>Get in touch to learn more about this programme or to participate.</p>
              <router-link to="/contact" class="btn btn-primary btn-block">Contact Us</router-link>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.programme-detail-page {
  min-height: 100vh;
}

.back-link {
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  display: inline-block;
  margin-bottom: 16px;
}

.back-link:hover {
  color: white;
}

.page-header h1 {
  font-size: 42px;
}

.loading-section {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.text-center {
  text-align: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
}

.detail-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 24px;
}

.programme-header {
  display: flex;
  gap: 20px;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 24px;
}

.programme-icon {
  font-size: 64px;
}

.programme-header h2 {
  font-size: 28px;
  margin-bottom: 4px;
}

.programme-subtitle {
  color: var(--text-secondary);
}

.detail-section {
  margin-bottom: 28px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h3 {
  font-size: 18px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.detail-section p {
  color: var(--text-secondary);
  line-height: 1.8;
}

.activities-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-sm);
}

.activities-card h3 {
  font-size: 20px;
  margin-bottom: 20px;
}

.related-activities {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--background-color);
  border-radius: var(--radius-md);
}

.activity-date {
  background: var(--primary-color);
  color: white;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  height: fit-content;
}

.activity-info h4 {
  font-size: 15px;
  margin-bottom: 4px;
}

.activity-info p {
  font-size: 13px;
  color: var(--text-secondary);
}

.detail-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sidebar-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.sidebar-card h4 {
  font-size: 18px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: var(--text-secondary);
  font-size: 14px;
}

.info-item .value {
  font-weight: 500;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  text-transform: capitalize;
}

.status-badge.active {
  background: #E8F5E9;
  color: #2E7D32;
}

.contact-card p {
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.6;
}

.btn-block {
  width: 100%;
}

@media (max-width: 1024px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .sidebar-card {
    flex: 1;
    min-width: 280px;
  }
}
</style>
