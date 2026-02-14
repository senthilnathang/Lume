<script setup>
import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Checkbox,
  CheckboxGroup,
  Col,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  RadioButton,
  RadioGroup,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { get, post } from '@/api/request';

const exportLoading = ref(false);
const exportModels = ref([]);
const selectedExportModel = ref(null);
const exportSelectedFields = ref([]);
const exportFormat = ref('csv');
const exportSearch = ref('');
const exportLimit = ref(null);
const exportPreviewData = ref([]);
const exportTotalRecords = ref(0);

const exportModelFields = computed(() => {
  if (!selectedExportModel.value) return [];
  const model = exportModels.value.find(m => m.name === selectedExportModel.value);
  return model?.fields || [];
});

const exportPreviewTableColumns = computed(() => {
  if (!exportPreviewData.value.length) return [];
  return Object.keys(exportPreviewData.value[0]).map(col => ({
    title: col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    dataIndex: col,
    key: col,
    width: 150,
    ellipsis: true,
  }));
});

async function fetchExportModels() {
  exportLoading.value = true;
  try {
    const res = await get('/base_features_data/export/models');
    exportModels.value = res || [];
  } catch (err) {
    console.error('Failed to fetch export models:', err);
  } finally {
    exportLoading.value = false;
  }
}

function onExportModelChange() {
  exportSelectedFields.value = exportModelFields.value.map(f => f.name);
  previewExport();
}

async function previewExport() {
  if (!selectedExportModel.value) return;
  exportLoading.value = true;
  try {
    const res = await post('/base_features_data/export/preview', {
      model_name: selectedExportModel.value,
      fields: exportSelectedFields.value.length ? exportSelectedFields.value : null,
      search: exportSearch.value || null,
      format: exportFormat.value,
    });
    exportPreviewData.value = res.data || [];
    exportTotalRecords.value = res.total_records || 0;
  } catch (err) {
    console.error('Failed to preview export:', err);
  } finally {
    exportLoading.value = false;
  }
}

async function executeExport() {
  if (!selectedExportModel.value) return;
  exportLoading.value = true;
  try {
    // Use raw fetch for file downloads to avoid Axios auto-parsing
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    const res = await fetch('/api/base_features_data/export/download', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model_name: selectedExportModel.value,
        fields: exportSelectedFields.value.length ? exportSelectedFields.value : null,
        search: exportSearch.value || null,
        limit: exportLimit.value || null,
        format: exportFormat.value,
      }),
    });

    if (!res.ok) throw new Error(`Export failed: ${res.status}`);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedExportModel.value}_export.${exportFormat.value}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to export:', err);
    Modal.error({ title: 'Export Failed', content: 'Failed to download export file' });
  } finally {
    exportLoading.value = false;
  }
}

onMounted(() => {
  fetchExportModels();
});
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <h2 style="margin: 0;">Data Export</h2>
      <p style="color: #666; margin: 4px 0 0;">Export model data to CSV or JSON</p>
    </div>

    <Card>
      <Spin :spinning="exportLoading">
        <Row :gutter="24">
          <Col :span="8">
            <Form layout="vertical">
              <FormItem label="Select Model to Export" required>
                <Select
                  v-model:value="selectedExportModel"
                  placeholder="Select a model"
                  style="width: 100%"
                  showSearch
                  @change="onExportModelChange"
                >
                  <SelectOption v-for="m in exportModels" :key="m.name" :value="m.name">
                    {{ m.display_name }}
                  </SelectOption>
                </Select>
              </FormItem>

              <FormItem label="Select Fields">
                <CheckboxGroup
                  v-model:value="exportSelectedFields"
                  style="display: flex; flex-direction: column; gap: 8px"
                >
                  <Checkbox v-for="f in exportModelFields" :key="f.name" :value="f.name">
                    {{ f.display_name }}
                  </Checkbox>
                </CheckboxGroup>
              </FormItem>

              <FormItem label="Search Filter">
                <Input
                  v-model:value="exportSearch"
                  placeholder="Search in name, email, etc."
                  allowClear
                  @pressEnter="previewExport"
                />
              </FormItem>

              <FormItem label="Limit Records">
                <Input
                  v-model:value="exportLimit"
                  type="number"
                  placeholder="No limit"
                />
              </FormItem>

              <FormItem label="Export Format">
                <RadioGroup v-model:value="exportFormat">
                  <RadioButton value="csv">
                    <FileTextOutlined /> CSV
                  </RadioButton>
                  <RadioButton value="json">
                    <FileExcelOutlined /> JSON
                  </RadioButton>
                </RadioGroup>
              </FormItem>

              <FormItem>
                <Space>
                  <Button @click="previewExport" :disabled="!selectedExportModel">
                    <ReloadOutlined /> Refresh Preview
                  </Button>
                  <Button
                    type="primary"
                    @click="executeExport"
                    :disabled="!selectedExportModel"
                  >
                    <DownloadOutlined /> Download Export
                  </Button>
                </Space>
              </FormItem>
            </Form>
          </Col>

          <Col :span="16">
            <Card title="Export Preview" size="small">
              <template #extra>
                <Tag color="blue">{{ exportTotalRecords }} total records</Tag>
              </template>

              <Table
                v-if="exportPreviewData.length"
                :columns="exportPreviewTableColumns"
                :dataSource="exportPreviewData"
                :pagination="false"
                size="small"
                :scroll="{ x: 'max-content', y: 400 }"
                rowKey="id"
              />
              <Empty v-else description="Select a model to preview data" />
            </Card>
          </Col>
        </Row>
      </Spin>
    </Card>
  </div>
</template>
