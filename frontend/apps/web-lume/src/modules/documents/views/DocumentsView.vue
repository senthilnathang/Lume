<template>
  <div class="documents-view">
    <div class="page-header">
      <div class="header-content">
        <h1>Documents</h1>
        <p class="subtitle">Manage your documents and files</p>
      </div>
      <div class="header-actions">
        <button @click="showUploadModal = true" class="add-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload Document
        </button>
      </div>
    </div>

    <div class="documents-grid">
      <div v-for="doc in documents" :key="doc.id" class="document-card">
        <div class="doc-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        </div>
        <div class="doc-info">
          <h3>{{ doc.name }}</h3>
          <p>{{ doc.description }}</p>
          <span class="doc-meta">{{ doc.size }} • {{ doc.uploaded_by }} • {{ formatDate(doc.created_at) }}</span>
        </div>
        <div class="doc-actions">
          <button @click="downloadDocument(doc)" class="action-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </button>
          <button @click="deleteDocument(doc)" class="action-btn delete">
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

const showUploadModal = ref(false);
const documents = ref([
  { id: 1, name: 'Annual Report 2024.pdf', description: 'Annual financial report', size: '2.4 MB', uploaded_by: 'John Smith', created_at: '2024-01-15' },
  { id: 2, name: 'Meeting Notes.docx', description: 'Team meeting notes', size: '156 KB', uploaded_by: 'Jane Doe', created_at: '2024-01-14' },
  { id: 3, name: 'Budget 2024.xlsx', description: 'Annual budget spreadsheet', size: '890 KB', uploaded_by: 'Admin', created_at: '2024-01-10' }
]);

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const downloadDocument = (doc) => {
  console.log('Download:', doc.name);
};

const deleteDocument = (doc) => {
  if (confirm(`Delete ${doc.name}?`)) {
    documents.value = documents.value.filter(d => d.id !== doc.id);
  }
};
</script>

<style scoped>
.documents-view {
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

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.document-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
}

.doc-icon {
  width: 48px;
  height: 48px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.doc-info {
  flex: 1;
  min-width: 0;
}

.doc-info h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-info p {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 8px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  font-size: 12px;
  color: #9ca3af;
}

.doc-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
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
