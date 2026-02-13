<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Header from '@/components/common/Header.vue';
import Footer from '@/components/common/Footer.vue';
import api from '@/api';

interface Document {
  id: number;
  title: string;
  type: string;
  year: number;
  file_path: string;
  download_count: number;
}

const documents = ref<Document[]>([]);
const loading = ref(true);
const activeTab = ref('all');

onMounted(async () => {
  try {
    const data = await api.get('/public/documents', { params: { type: activeTab.value } });
    documents.value = data.documents || [];
  } catch (error) {
    console.error('Failed to fetch documents:', error);
  } finally {
    loading.value = false;
  }
});

const documentTypes = [
  { value: 'all', label: 'All Documents' },
  { value: 'annual_report', label: 'Annual Reports' },
  { value: 'brochure', label: 'Brochures' },
  { value: 'policy', label: 'Policies' }
];

const formatFileSize = (bytes: number) => {
  if (!bytes) return '';
  return (bytes / 1024).toFixed(1) + ' KB';
};
</script>

<template>
  <div class="documents-page">
    <Header />

    <section class="page-header">
      <div class="container">
        <h1>Documents & Reports</h1>
        <p>Access our annual reports, brochures, and policy documents</p>
      </div>
    </section>

    <section class="breadcrumb-section">
      <div class="container">
        <div class="breadcrumb">
          <router-link to="/">Home</router-link>
          <span>/</span>
          <span>Documents</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="tabs">
          <button 
            v-for="tab in documentTypes" 
            :key="tab.value"
            :class="['tab', { active: activeTab === tab.value }]"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <div class="spinner"></div>
        </div>

        <div v-else-if="documents.length" class="documents-grid">
          <div v-for="doc in documents" :key="doc.id" class="document-card">
            <div class="doc-icon">📄</div>
            <div class="doc-info">
              <h3>{{ doc.title }}</h3>
              <div class="doc-meta">
                <span class="doc-type">{{ doc.type?.replace('_', ' ') }}</span>
                <span v-if="doc.year" class="doc-year">{{ doc.year }}</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm download-btn">Download</button>
          </div>
        </div>

        <div v-else class="empty-state">
          <p>No documents found in this category.</p>
        </div>
      </div>
    </section>

    <Footer />
  </div>
</template>

<style scoped>
.documents-page { min-height: 100vh; }

.breadcrumb-section { background: white; padding: 12px 0; }

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.tab {
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.tab:hover { border-color: var(--primary-color); }

.tab.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.loading-state { text-align: center; padding: 80px 0; }

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

.documents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.document-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.document-card:hover {
  box-shadow: var(--shadow-md);
}

.doc-icon {
  font-size: 40px;
  width: 60px;
  text-align: center;
}

.doc-info { flex: 1; }

.doc-info h3 {
  font-size: 16px;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.doc-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.doc-type {
  text-transform: capitalize;
}

.download-btn { flex-shrink: 0; }

.empty-state {
  text-align: center;
  padding: 80px 0;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .documents-grid { grid-template-columns: 1fr; }
}
</style>
