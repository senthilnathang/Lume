<script setup lang="ts">
// @ts-nocheck
import { onMounted, ref } from 'vue';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

interface Programme {
  id: number;
  title: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  objectives: string;
  target_beneficiaries: string;
}

const programmes = ref<Programme[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await api.get('/public/programmes');
    programmes.value = data.programmes || [];
  } catch (error) {
    console.error('Failed to fetch programmes:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="programmes-page">
    <Header />

    <section class="page-header">
      <div class="container">
        <h1>Our Programmes</h1>
        <p>Comprehensive development initiatives for community empowerment</p>
      </div>
    </section>

    <section class="breadcrumb-section">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">Home</router-link>
          <span>/</span>
          <span>Programmes</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading programmes...</p>
        </div>

        <div v-else class="programmes-grid">
          <div 
            v-for="programme in programmes" 
            :key="programme.id" 
            class="programme-card"
            :style="{ '--card-color': programme.color || '#2E7D32' }"
          >
            <div class="programme-icon">{{ programme.icon || '📋' }}</div>
            <div class="programme-content">
              <h3>{{ programme.title }}</h3>
              <p>{{ programme.description }}</p>
              
              <div v-if="programme.target_beneficiaries" class="beneficiaries">
                <strong>Target:</strong> {{ programme.target_beneficiaries }}
              </div>
              
              <router-link :to="`/programmes/${programme.slug}`" class="btn btn-outline">
                Learn More
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.programmes-page {
  min-height: 100vh;
}

.breadcrumb-section {
  background: white;
  padding: 12px 0;
}

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
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.programmes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
}

.programme-card {
  background: white;
  border-radius: var(--radius-lg);
  display: flex;
  overflow: hidden;
  transition: all 0.3s ease;
  border-left: 5px solid var(--card-color);
}

.programme-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
}

.programme-icon {
  width: 140px;
  background: linear-gradient(135deg, var(--card-color) 0%, 
    color-mix(in srgb, var(--card-color) 70%, white) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56px;
  flex-shrink: 0;
}

.programme-content {
  padding: 32px;
  flex: 1;
}

.programme-content h3 {
  font-size: 22px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.programme-content p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
}

.beneficiaries {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  padding: 8px 12px;
  background: var(--background-color);
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .programmes-grid {
    grid-template-columns: 1fr;
  }

  .programme-card {
    flex-direction: column;
  }

  .programme-icon {
    width: 100%;
    height: 140px;
  }
}
</style>
