<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Upload,
  Modal,
  Image,
  Row,
  Col,
  Tag,
  Space,
  Input,
  Select,
  SelectOption,
  Tooltip,
  Popconfirm,
  message,
  Spin,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  InboxOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue';

import { Eye, Download, Trash2 } from 'lucide-vue-next';

defineOptions({
  name: 'MediaLibrary',
});

const loading = ref(false);
const searchText = ref('');
const typeFilter = ref('all');
const previewVisible = ref(false);
const previewImage = ref('');

const mediaItems = ref([
  {
    id: 1,
    name: 'hero-banner.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=1',
    size: '1.2 MB',
    dimensions: '1920x1080',
    uploadedAt: '2026-02-10',
  },
  {
    id: 2,
    name: 'team-photo.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=2',
    size: '2.4 MB',
    dimensions: '2400x1600',
    uploadedAt: '2026-02-08',
  },
  {
    id: 3,
    name: 'event-photo-1.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=3',
    size: '890 KB',
    dimensions: '1600x900',
    uploadedAt: '2026-02-05',
  },
  {
    id: 4,
    name: 'logo-transparent.png',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=4',
    size: '45 KB',
    dimensions: '512x512',
    uploadedAt: '2026-01-20',
  },
  {
    id: 5,
    name: 'background.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=5',
    size: '3.1 MB',
    dimensions: '3840x2160',
    uploadedAt: '2026-01-15',
  },
  {
    id: 6,
    name: 'volunteer-day.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=6',
    size: '1.8 MB',
    dimensions: '1800x1200',
    uploadedAt: '2026-01-10',
  },
]);

const filteredMedia = computed(() => {
  return mediaItems.value.filter((item) => {
    const matchesSearch = !searchText.value || item.name.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesType = typeFilter.value === 'all' || item.type === typeFilter.value;
    return matchesSearch && matchesType;
  });
});

const mediaTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
];

async function loadMedia() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    loading.value = false;
  }
}

function handlePreview(item) {
  previewImage.value = item.url;
  previewVisible.value = true;
}

function handleDelete(item) {
  mediaItems.value = mediaItems.value.filter((m) => m.id !== item.id);
  message.success('Media deleted');
}

function handleDownload(item) {
  message.info(`Downloading ${item.name}`);
}

const uploadProps = {
  name: 'file',
  multiple: true,
  action: '#',
  showUploadList: false,
  accept: 'image/*,video/*',
};

onMounted(() => {
  loadMedia();
});
</script>

<template>
  <Page title="Media Library" description="Manage your media files">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search media..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select v-model:value="typeFilter" style="width: 150px">
              <SelectOption v-for="type in mediaTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </SelectOption>
            </Select>
          </Space>
          <Upload v-bind="uploadProps">
            <Button type="primary">
              <PlusOutlined />
              Upload Media
            </Button>
          </Upload>
        </div>

        <Row :gutter="[16, 16]">
          <Col v-for="item in filteredMedia" :key="item.id" :xs="24" :sm="12" :md="8" :lg="6">
            <div class="media-item">
              <div class="media-preview" @click="handlePreview(item)">
                <Image :src="item.url" :preview="false" style="width: 100%; height: 150px; object-fit: cover" />
                <div class="media-overlay">
                  <Eye :size="24" />
                </div>
              </div>
              <div class="media-info">
                <div class="media-name" :title="item.name">{{ item.name }}</div>
                <div class="media-meta">
                  <Tag size="small">{{ item.type }}</Tag>
                  <span class="text-xs">{{ item.size }}</span>
                </div>
                <div class="media-actions">
                  <Tooltip title="View">
                    <Button type="text" size="small" @click="handlePreview(item)">
                      <template #icon><Eye :size="15" /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Download">
                    <Button type="text" size="small" @click="handleDownload(item)">
                      <template #icon><Download :size="15" /></template>
                    </Button>
                  </Tooltip>
                  <Popconfirm title="Delete this media?" ok-text="Delete" ok-type="danger" @confirm="handleDelete(item)">
                    <Tooltip title="Delete">
                      <Button type="text" size="small" danger>
                        <template #icon><Trash2 :size="15" /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Modal v-model:open="previewVisible" :footer="null" width="800px">
        <Image :src="previewImage" style="width: 100%" />
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.media-item {
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.media-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.media-preview {
  position: relative;
  cursor: pointer;
  height: 150px;
  overflow: hidden;
}

.media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  color: white;
  font-size: 24px;
}

.media-preview:hover .media-overlay {
  opacity: 1;
}

.media-info {
  padding: 12px;
}

.media-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.media-meta {
  display: flex;
  align-items: center;
8px;
   gap:  margin-bottom: 8px;
}

.media-actions {
  display: flex;
  gap: 4px;
}

.media-actions .ant-btn {
  opacity: 0.55;
  transition: opacity 0.15s;
}

.media-item:hover .media-actions .ant-btn {
  opacity: 1;
}

.text-xs {
  font-size: 12px;
  color: #6b7280;
}
</style>
