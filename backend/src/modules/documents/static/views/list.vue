<script setup>
import { ref, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  SelectOption,
  Dropdown,
  Menu,
  MenuItem,
  message,
  Spin,
} from 'ant-design-vue';

import {
  PlusOutlined,
  SearchOutlined,
  FolderOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  MoreOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'DocumentsList',
});

const loading = ref(false);
const searchText = ref('');
const typeFilter = ref(null);

const columns = [
  {
    title: 'Name',
    key: 'name',
  },
  {
    title: 'Type',
    dataIndex: 'type',
    key: 'type',
    width: 100,
  },
  {
    title: 'Size',
    dataIndex: 'size',
    key: 'size',
    width: 100,
  },
  {
    title: 'Modified',
    dataIndex: 'modified',
    key: 'modified',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 80,
  },
];

const documents = ref([
  {
    id: 1,
    name: 'Annual Report 2025.pdf',
    type: 'PDF',
    size: '2.4 MB',
    modified: '2026-02-10',
    folder: 'Reports',
  },
  {
    id: 2,
    name: 'Budget Q1.xlsx',
    type: 'Excel',
    size: '156 KB',
    modified: '2026-02-08',
    folder: 'Finance',
  },
  {
    id: 3,
    name: 'Project Proposal.docx',
    type: 'Word',
    size: '89 KB',
    modified: '2026-02-05',
    folder: 'Projects',
  },
  {
    id: 4,
    name: 'Meeting Notes.docx',
    type: 'Word',
    size: '34 KB',
    modified: '2026-02-12',
    folder: 'Meetings',
  },
  {
    id: 5,
    name: 'Logo Design.png',
    type: 'Image',
    size: '1.2 MB',
    modified: '2026-01-20',
    folder: 'Assets',
  },
]);

const documentTypes = ['PDF', 'Word', 'Excel', 'Image', 'Video'];

const filteredDocuments = computed(() => {
  return documents.value.filter((doc) => {
    const matchesSearch =
      !searchText.value || doc.name.toLowerCase().includes(searchText.value.toLowerCase());
    const matchesType = !typeFilter.value || doc.type === typeFilter.value;
    return matchesSearch && matchesType;
  });
});

function getTypeIcon(type) {
  const icons = {
    PDF: FilePdfOutlined,
    Word: FileWordOutlined,
    Excel: FileExcelOutlined,
    Image: FileImageOutlined,
  };
  return icons[type] || FileOutlined;
}

function getTypeColor(type) {
  const colors = {
    PDF: 'red',
    Word: 'blue',
    Excel: 'green',
    Image: 'orange',
  };
  return colors[type] || 'default';
}

async function loadDocuments() {
  loading.value = true;
  try {
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    loading.value = false;
  }
}

function handleUpload() {
  message.info('Upload dialog would open here');
}

function handleDownload(doc) {
  message.info(`Downloading ${doc.name}`);
}

function handleShare(doc) {
  message.info(`Sharing ${doc.name}`);
}

function handleDelete(doc) {
  documents.value = documents.value.filter((d) => d.id !== doc.id);
  message.success('Document deleted');
}

onMounted(() => {
  loadDocuments();
});
</script>

<template>
  <Page title="Documents" description="Manage your documents">
    <Spin :spinning="loading">
      <Card>
        <div class="flex justify-between items-center mb-4">
          <Space>
            <Input
              v-model:value="searchText"
              placeholder="Search documents..."
              style="width: 250px"
              allow-clear
            >
              <template #prefix>
                <SearchOutlined />
              </template>
            </Input>
            <Select
              v-model:value="typeFilter"
              placeholder="All Types"
              style="width: 150px"
              allow-clear
            >
              <SelectOption v-for="type in documentTypes" :key="type" :value="type">
                {{ type }}
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="handleUpload">
            <PlusOutlined />
            Upload
          </Button>
        </div>

        <Table
          :data-source="filteredDocuments"
          :columns="columns"
          :row-key="(record) => record.id"
          :pagination="{ pageSize: 10 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <Space>
                <component :is="getTypeIcon(record.type)" :style="{ color: getTypeColor(record.type) }" />
                <span class="font-medium">{{ record.name }}</span>
              </Space>
            </template>

            <template v-else-if="column.key === 'type'">
              <Tag :color="getTypeColor(record.type)">{{ record.type }}</Tag>
            </template>

            <template v-else-if="column.key === 'actions'">
              <Dropdown>
                <template #overlay>
                  <Menu>
                    <MenuItem key="download" @click="handleDownload(record)">
                      <DownloadOutlined /> Download
                    </MenuItem>
                    <MenuItem key="share" @click="handleShare(record)">
                      <ShareAltOutlined /> Share
                    </MenuItem>
                    <MenuItem key="delete" danger @click="handleDelete(record)">
                      <DeleteOutlined /> Delete
                    </MenuItem>
                  </Menu>
                </template>
                <Button type="text">
                  <MoreOutlined />
                </Button>
              </Dropdown>
            </template>
          </template>
        </Table>
      </Card>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 16px;
}

.font-medium {
  font-weight: 500;
}
</style>
