<script setup>
import { computed, onMounted, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Divider,
  Form,
  FormItem,
  Modal,
  Result,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  TypographyTitle,
  UploadDragger,
} from 'ant-design-vue';
import {
  DownloadOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue';

import { get, post } from '@/api/request';

const { Step } = Steps;

// === IMPORT STATE ===
const importStep = ref(0);
const importLoading = ref(false);
const importModels = ref([]);
const selectedImportModel = ref(null);
const importFile = ref(null);
const importFileName = ref('');
const importFileContent = ref('');
const importHasHeader = ref(true);
const importDelimiter = ref(',');
const importPreviewData = ref([]);
const importPreviewColumns = ref([]);
const importTotalRows = ref(0);
const importSuggestedMappings = ref({});
const importColumnMappings = ref([]);
const importValidationResult = ref(null);
const importExecuteResult = ref(null);
const importUpdateExisting = ref(false);
const importSkipErrors = ref(false);

// === COMPUTED ===
const importModelFields = computed(() => {
  if (!selectedImportModel.value) return [];
  const model = importModels.value.find(m => m.name === selectedImportModel.value);
  return model?.fields || [];
});

const importPreviewATableColumns = computed(() => {
  return importPreviewColumns.value.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    width: 150,
    ellipsis: true,
  }));
});

// === IMPORT METHODS ===
async function fetchImportModels() {
  importLoading.value = true;
  try {
    const res = await get('/base_features_data/import/models');
    importModels.value = res || [];
  } catch (err) {
    console.error('Failed to fetch import models:', err);
  } finally {
    importLoading.value = false;
  }
}

function handleImportFileUpload(info) {
  const file = info.file;
  if (file.status === 'removed') {
    importFile.value = null;
    importFileName.value = '';
    importFileContent.value = '';
    return;
  }

  importFile.value = file.originFileObj || file;
  importFileName.value = file.name;

  // Read file content as base64
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(',')[1];
    importFileContent.value = base64;
  };
  reader.readAsDataURL(importFile.value);
}

async function previewImport() {
  if (!selectedImportModel.value || !importFileContent.value) return;

  importLoading.value = true;
  try {
    const res = await post('/base_features_data/import/preview', {
      model_name: selectedImportModel.value,
      file_content: importFileContent.value,
      file_name: importFileName.value,
      has_header: importHasHeader.value,
      delimiter: importDelimiter.value,
      max_preview_rows: 10,
    });

    importPreviewColumns.value = res.columns || [];
    importPreviewData.value = res.preview_data || [];
    importTotalRows.value = res.total_rows || 0;
    importSuggestedMappings.value = res.suggested_mappings || {};

    // Initialize column mappings
    importColumnMappings.value = importPreviewColumns.value.map(col => ({
      source_column: col,
      target_field: importSuggestedMappings.value[col] || '',
    }));

    importStep.value = 1;
  } catch (err) {
    console.error('Failed to preview import:', err);
    Modal.error({
      title: 'Preview Failed',
      content: err.response?.data?.error || err.message || 'Failed to parse file',
    });
  } finally {
    importLoading.value = false;
  }
}

async function validateImport() {
  importLoading.value = true;
  try {
    const mappings = importColumnMappings.value.filter(m => m.target_field);

    const res = await post('/base_features_data/import/validate', {
      model_name: selectedImportModel.value,
      file_content: importFileContent.value,
      file_name: importFileName.value,
      has_header: importHasHeader.value,
      delimiter: importDelimiter.value,
      column_mappings: mappings,
    });

    importValidationResult.value = res;
    importStep.value = 2;
  } catch (err) {
    console.error('Failed to validate import:', err);
    Modal.error({
      title: 'Validation Failed',
      content: err.response?.data?.error || err.message || 'Validation failed',
    });
  } finally {
    importLoading.value = false;
  }
}

async function executeImport() {
  importLoading.value = true;
  try {
    const mappings = importColumnMappings.value.filter(m => m.target_field);

    const res = await post('/base_features_data/import/execute', {
      model_name: selectedImportModel.value,
      file_content: importFileContent.value,
      file_name: importFileName.value,
      has_header: importHasHeader.value,
      delimiter: importDelimiter.value,
      column_mappings: mappings,
      update_existing: importUpdateExisting.value,
      skip_errors: importSkipErrors.value,
    });

    importExecuteResult.value = res;
    importStep.value = 3;
  } catch (err) {
    console.error('Failed to execute import:', err);
    Modal.error({
      title: 'Import Failed',
      content: err.response?.data?.error || err.message || 'Import failed',
    });
  } finally {
    importLoading.value = false;
  }
}

function resetImport() {
  importStep.value = 0;
  importFile.value = null;
  importFileName.value = '';
  importFileContent.value = '';
  importPreviewData.value = [];
  importPreviewColumns.value = [];
  importTotalRows.value = 0;
  importSuggestedMappings.value = {};
  importColumnMappings.value = [];
  importValidationResult.value = null;
  importExecuteResult.value = null;
}

async function downloadTemplate() {
  if (!selectedImportModel.value) return;

  try {
    window.open(`/api/base_features_data/import/template/${selectedImportModel.value}`, '_blank');
  } catch (err) {
    console.error('Failed to download template:', err);
  }
}

// === LIFECYCLE ===
onMounted(() => {
  fetchImportModels();
});
</script>

<template>
  <div>
    <div style="margin-bottom: 16px;">
      <h2 style="margin: 0;">Data Import</h2>
      <p style="color: #666; margin: 4px 0 0;">Import data from CSV files</p>
    </div>

    <Card>
      <Steps :current="importStep" style="margin-bottom: 24px;">
        <Step title="Upload File" description="Select file and model" />
        <Step title="Map Columns" description="Match columns to fields" />
        <Step title="Validate" description="Check data" />
        <Step title="Complete" description="Import results" />
      </Steps>

      <Spin :spinning="importLoading">
        <!-- Step 0: Upload -->
        <div v-if="importStep === 0">
          <Row :gutter="24">
            <Col :span="12">
              <Form layout="vertical">
                <FormItem label="Select Model to Import" required>
                  <Select
                    v-model:value="selectedImportModel"
                    placeholder="Select a model"
                    style="width: 100%;"
                    showSearch
                  >
                    <SelectOption v-for="m in importModels" :key="m.name" :value="m.name">
                      {{ m.display_name }}
                      <span v-if="m.description" style="color: #888; font-size: 12px;">
                        - {{ m.description }}
                      </span>
                    </SelectOption>
                  </Select>
                </FormItem>

                <FormItem label="Upload CSV File" required>
                  <UploadDragger
                    :beforeUpload="() => false"
                    @change="handleImportFileUpload"
                    :maxCount="1"
                    accept=".csv,.txt"
                  >
                    <p class="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p class="ant-upload-text">Click or drag file to upload</p>
                    <p class="ant-upload-hint">Support for CSV files only</p>
                  </UploadDragger>
                </FormItem>

                <Row :gutter="16">
                  <Col :span="12">
                    <FormItem label="Has Header Row">
                      <Checkbox v-model:checked="importHasHeader">First row contains headers</Checkbox>
                    </FormItem>
                  </Col>
                  <Col :span="12">
                    <FormItem label="Delimiter">
                      <Select v-model:value="importDelimiter" style="width: 100%;">
                        <SelectOption value=",">Comma (,)</SelectOption>
                        <SelectOption value=";">Semicolon (;)</SelectOption>
                        <SelectOption value="\t">Tab</SelectOption>
                        <SelectOption value="|">Pipe (|)</SelectOption>
                      </Select>
                    </FormItem>
                  </Col>
                </Row>
              </Form>
            </Col>

            <Col :span="12">
              <Card title="Model Fields" size="small" v-if="selectedImportModel">
                <div style="max-height: 300px; overflow-y: auto;">
                  <div v-for="field in importModelFields" :key="field.name" style="margin-bottom: 8px;">
                    <Tag :color="field.required ? 'red' : 'blue'">
                      {{ field.field_type }}
                    </Tag>
                    <strong>{{ field.display_name }}</strong>
                    <span style="color: #888;"> ({{ field.name }})</span>
                    <Tag v-if="field.required" color="orange" size="small">Required</Tag>
                  </div>
                </div>
                <Divider />
                <Button type="link" @click="downloadTemplate">
                  <DownloadOutlined /> Download Template
                </Button>
              </Card>
            </Col>
          </Row>

          <div style="margin-top: 24px; text-align: right;">
            <Button
              type="primary"
              :disabled="!selectedImportModel || !importFileContent"
              @click="previewImport"
            >
              Preview File
            </Button>
          </div>
        </div>

        <!-- Step 1: Map Columns -->
        <div v-if="importStep === 1">
          <Alert
            type="info"
            :message="`Found ${importTotalRows} rows in file`"
            show-icon
            style="margin-bottom: 16px;"
          />

          <Row :gutter="24">
            <Col :span="12">
              <TypographyTitle :level="5">Column Mappings</TypographyTitle>
              <div style="max-height: 400px; overflow-y: auto;">
                <div
                  v-for="mapping in importColumnMappings"
                  :key="mapping.source_column"
                  style="display: flex; align-items: center; margin-bottom: 12px;"
                >
                  <Tag style="min-width: 120px;">{{ mapping.source_column }}</Tag>
                  <span style="margin: 0 12px;">&rarr;</span>
                  <Select
                    v-model:value="mapping.target_field"
                    style="width: 200px;"
                    allowClear
                    placeholder="Select field"
                  >
                    <SelectOption value="">-- Skip --</SelectOption>
                    <SelectOption v-for="f in importModelFields" :key="f.name" :value="f.name">
                      {{ f.display_name }}
                    </SelectOption>
                  </Select>
                </div>
              </div>
            </Col>

            <Col :span="12">
              <TypographyTitle :level="5">Data Preview</TypographyTitle>
              <Table
                :columns="importPreviewATableColumns"
                :dataSource="importPreviewData"
                :pagination="false"
                size="small"
                :scroll="{ x: 'max-content' }"
              />
            </Col>
          </Row>

          <div style="margin-top: 24px; text-align: right;">
            <Space>
              <Button @click="importStep = 0">Back</Button>
              <Button type="primary" @click="validateImport">
                Validate Data
              </Button>
            </Space>
          </div>
        </div>

        <!-- Step 2: Validate -->
        <div v-if="importStep === 2">
          <div v-if="importValidationResult">
            <Alert
              v-if="importValidationResult.is_valid"
              type="success"
              message="Validation Passed"
              :description="`All ${importValidationResult.valid_rows} rows are valid and ready for import.`"
              show-icon
              style="margin-bottom: 16px;"
            />
            <Alert
              v-else
              type="warning"
              message="Validation Errors Found"
              :description="`${importValidationResult.error_count} errors found in ${importValidationResult.total_rows} rows.`"
              show-icon
              style="margin-bottom: 16px;"
            />

            <Row :gutter="16" style="margin-bottom: 16px;">
              <Col :span="6">
                <Card size="small">
                  <template #title>Total Rows</template>
                  {{ importValidationResult.total_rows }}
                </Card>
              </Col>
              <Col :span="6">
                <Card size="small">
                  <template #title>Valid Rows</template>
                  <span style="color: #52c41a;">{{ importValidationResult.valid_rows }}</span>
                </Card>
              </Col>
              <Col :span="6">
                <Card size="small">
                  <template #title>Error Rows</template>
                  <span style="color: #ff4d4f;">{{ importValidationResult.error_count }}</span>
                </Card>
              </Col>
            </Row>

            <div v-if="importValidationResult.errors?.length" style="margin-bottom: 16px;">
              <TypographyTitle :level="5">Errors</TypographyTitle>
              <Table
                :dataSource="importValidationResult.errors"
                :pagination="{ pageSize: 5 }"
                size="small"
                :columns="[
                  { title: 'Row', dataIndex: 'row_number', width: 80 },
                  { title: 'Column', dataIndex: 'column', width: 120 },
                  { title: 'Value', dataIndex: 'value', width: 150 },
                  { title: 'Error', dataIndex: 'error' },
                ]"
              />
            </div>

            <Row :gutter="16">
              <Col :span="12">
                <Checkbox v-model:checked="importUpdateExisting">
                  Update existing records (match by unique fields)
                </Checkbox>
              </Col>
              <Col :span="12">
                <Checkbox v-model:checked="importSkipErrors">
                  Skip rows with errors and import valid rows only
                </Checkbox>
              </Col>
            </Row>
          </div>

          <div style="margin-top: 24px; text-align: right;">
            <Space>
              <Button @click="importStep = 1">Back</Button>
              <Button
                type="primary"
                :disabled="!importValidationResult?.is_valid && !importSkipErrors"
                @click="executeImport"
              >
                Execute Import
              </Button>
            </Space>
          </div>
        </div>

        <!-- Step 3: Complete -->
        <div v-if="importStep === 3">
          <Result
            v-if="importExecuteResult"
            :status="importExecuteResult.status === 'COMPLETED' ? 'success' : importExecuteResult.status === 'PARTIAL' ? 'warning' : 'error'"
            :title="importExecuteResult.status === 'COMPLETED' ? 'Import Completed!' : importExecuteResult.status === 'PARTIAL' ? 'Partial Import' : 'Import Failed'"
          >
            <template #subTitle>
              <div>
                <p>Imported: <strong>{{ importExecuteResult.imported_rows }}</strong> rows</p>
                <p>Updated: <strong>{{ importExecuteResult.updated_rows }}</strong> rows</p>
                <p v-if="importExecuteResult.error_rows">Errors: <strong>{{ importExecuteResult.error_rows }}</strong> rows</p>
              </div>
            </template>
            <template #extra>
              <Button type="primary" @click="resetImport">
                Import Another File
              </Button>
            </template>
          </Result>
        </div>
      </Spin>
    </Card>
  </div>
</template>

<style scoped>
.ant-upload-drag-icon {
  margin-bottom: 16px;
}

.ant-upload-drag-icon .anticon {
  font-size: 48px;
  color: #1890ff;
}
</style>
