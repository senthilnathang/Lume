<template>
  <div class="media-view">
    <div class="page-header">
      <h1>Media Library</h1>
      <p class="subtitle">Manage your images and media files</p>
    </div>
    <div class="media-toolbar">
      <div class="search-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" placeholder="Search media..." v-model="searchQuery" />
      </div>
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
          </svg>
        </button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
      </div>
      <button class="upload-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        Upload
      </button>
    </div>
    <div class="media-grid" :class="viewMode">
      <div v-for="item in mediaItems" :key="item.id" class="media-item">
        <div class="media-preview">
          <img v-if="item.type === 'image'" :src="item.url" :alt="item.name" />
          <div v-else class="file-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div class="media-overlay">
            <button class="preview-btn" @click="previewMedia(item)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button class="delete-btn" @click="deleteMedia(item)">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="media-info">
          <span class="media-name">{{ item.name }}</span>
          <span class="media-meta">{{ item.size }} • {{ item.uploaded_by }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const searchQuery = ref('');
const viewMode = ref('grid');
const mediaItems = ref([
  { id: 1, name: 'hero-banner.jpg', type: 'image', url: 'https://via.placeholder.com/400x300', size: '2.4 MB', uploaded_by: 'Admin' },
  { id: 2, name: 'logo.png', type: 'image', url: 'https://via.placeholder.com/400x300', size: '156 KB', uploaded_by: 'Sarah' },
  { id: 3, name: 'event-photo.jpg', type: 'image', url: 'https://via.placeholder.com/400x300', size: '890 KB', uploaded_by: 'Michael' },
  { id: 4, name: 'annual-report.pdf', type: 'document', size: '2.1 MB', uploaded_by: 'Emily' },
  { id: 5, name: 'team-photo.jpg', type: 'image', url: 'https://via.placeholder.com/400x300', size: '1.2 MB', uploaded_by: 'Admin' },
  { id: 6, name: 'logo-dark.png', type: 'image', url: 'https://via.placeholder.com/400x300', size: '89 KB', uploaded_by: 'Sarah' }
]);

const previewMedia = (item) => { console.log('Preview:', item.name); };
const deleteMedia = (item) => { if (confirm(`Delete ${item.name}?`)) mediaItems.value = mediaItems.value.filter(m => m.id !== item.id); };
</script>

<style scoped>
.media-view { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
.subtitle { color: #64748b; margin: 0; }
.media-toolbar { display: flex; gap: 16px; margin-bottom: 24px; align-items: center; }
.search-box { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; flex: 1; max-width: 400px; }
.search-box svg { color: #9ca3af; }
.search-box input { border: none; background: transparent; outline: none; flex: 1; font-size: 14px; }
.view-toggle { display: flex; background: white; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.view-toggle button { padding: 10px 14px; background: none; border: none; color: #6b7280; cursor: pointer; }
.view-toggle button.active { background: #4f46e5; color: white; }
.upload-btn { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #4f46e5; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
.upload-btn:hover { background: #4338ca; }
.media-grid { display: grid; gap: 20px; }
.media-grid.grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.media-grid.list { grid-template-columns: 1fr; }
.media-item { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.media-preview { position: relative; aspect-ratio: 4/3; background: #f3f4f6; }
.media-preview img { width: 100%; height: 100%; object-fit: cover; }
.file-icon { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #6b7280; }
.media-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; gap: 12px; opacity: 0; transition: opacity 0.2s; }
.media-item:hover .media-overlay { opacity: 1; }
.preview-btn, .delete-btn { width: 40px; height: 40px; background: white; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #374151; }
.delete-btn:hover { color: #ef4444; }
.media-info { padding: 12px 16px; }
.media-name { display: block; font-weight: 500; color: #1a1a2e; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.media-meta { font-size: 12px; color: #9ca3af; }
.media-grid.list .media-item { display: flex; align-items: center; }
.media-grid.list .media-preview { width: 80px; height: 60px; flex-shrink: 0; border-radius: 8px; margin: 12px; }
.media-grid.list .media-info { flex: 1; padding: 12px; }
</style>
