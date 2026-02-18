<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Wand2, Sparkles, Copy, RefreshCw } from 'lucide-vue-next';
import { message } from 'ant-design-vue';
import { post } from '@/api/request';

const props = defineProps<{
  modelValue: boolean;
  fieldType: 'text' | 'textarea' | 'code';
  currentValue?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'apply', value: string): void;
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// Form state
const prompt = ref('');
const tone = ref<'professional' | 'casual' | 'creative' | 'formal' | 'friendly'>('professional');
const length = ref<'short' | 'medium' | 'long'>('medium');
const language = ref<'CSS' | 'HTML' | 'JavaScript' | 'TypeScript'>('HTML');

// Output state
const result = ref('');
const loading = ref(false);

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'creative', label: 'Creative' },
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
];

const lengthOptions = [
  { value: 'short', label: 'Short (~50 words)' },
  { value: 'medium', label: 'Medium (~150 words)' },
  { value: 'long', label: 'Long (~400 words)' },
];

const languageOptions = [
  { value: 'CSS', label: 'CSS' },
  { value: 'HTML', label: 'HTML' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
];

const isCodeMode = computed(() => props.fieldType === 'code');
const isTextMode = computed(() => props.fieldType === 'text' || props.fieldType === 'textarea');

// Reset state when modal opens
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    result.value = '';
    loading.value = false;
    if (!prompt.value && props.currentValue) {
      prompt.value = `Improve this: ${props.currentValue.slice(0, 200)}`;
    }
  }
});

async function generate() {
  if (!prompt.value.trim()) {
    message.warning('Please enter a prompt');
    return;
  }

  loading.value = true;
  result.value = '';

  try {
    if (isCodeMode.value) {
      const data = await post<{ content: string }>('/website/ai/generate-code', {
        prompt: prompt.value,
        language: language.value.toLowerCase(),
      });
      result.value = data.content;
    } else {
      const data = await post<{ content: string }>('/website/ai/generate-text', {
        prompt: prompt.value,
        tone: tone.value,
        length: length.value,
      });
      result.value = data.content;
    }
  } catch (err: any) {
    message.error(err?.message || 'AI generation failed. Check your AI settings.');
  } finally {
    loading.value = false;
  }
}

function apply() {
  if (!result.value) return;
  emit('apply', result.value);
  visible.value = false;
}

async function copyToClipboard() {
  if (!result.value) return;
  try {
    await navigator.clipboard.writeText(result.value);
    message.success('Copied to clipboard');
  } catch {
    message.error('Failed to copy');
  }
}

function regenerate() {
  generate();
}

function handleClose() {
  visible.value = false;
  prompt.value = '';
  result.value = '';
}
</script>

<template>
  <a-modal
    v-model:open="visible"
    :title="null"
    :footer="null"
    width="600px"
    :destroy-on-close="true"
    class="ai-modal"
    @cancel="handleClose"
  >
    <div class="ai-modal-header">
      <div class="ai-modal-title">
        <Sparkles :size="18" class="ai-icon" />
        <span>AI Content Generator</span>
      </div>
      <p class="ai-modal-subtitle">
        {{ isCodeMode ? 'Describe the code you want to generate' : 'Describe what content you need' }}
      </p>
    </div>

    <div class="ai-modal-body">
      <!-- Prompt -->
      <div class="form-group">
        <label class="form-label">Prompt</label>
        <a-textarea
          v-model:value="prompt"
          :rows="3"
          placeholder="e.g. Write a compelling hero section headline for a SaaS product that manages team projects..."
          :disabled="loading"
          @pressEnter.ctrl="generate"
        />
      </div>

      <!-- Options row -->
      <div class="options-row">
        <!-- Tone — text/textarea only -->
        <div v-if="isTextMode" class="form-group form-group--inline">
          <label class="form-label">Tone</label>
          <a-select v-model:value="tone" size="small" style="width: 140px" :disabled="loading">
            <a-select-option v-for="opt in toneOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </div>

        <!-- Length — text only -->
        <div v-if="fieldType === 'text'" class="form-group form-group--inline">
          <label class="form-label">Length</label>
          <a-select v-model:value="length" size="small" style="width: 160px" :disabled="loading">
            <a-select-option v-for="opt in lengthOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </div>

        <!-- Language — code mode only -->
        <div v-if="isCodeMode" class="form-group form-group--inline">
          <label class="form-label">Language</label>
          <a-select v-model:value="language" size="small" style="width: 160px" :disabled="loading">
            <a-select-option v-for="opt in languageOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </a-select-option>
          </a-select>
        </div>

        <!-- Generate button -->
        <div class="form-group form-group--inline" style="margin-left: auto;">
          <a-button
            type="primary"
            :loading="loading"
            :disabled="!prompt.trim()"
            @click="generate"
          >
            <template #icon>
              <Wand2 :size="14" />
            </template>
            {{ result ? 'Regenerate' : 'Generate' }}
          </a-button>
        </div>
      </div>

      <!-- Result area -->
      <div v-if="loading" class="result-loading">
        <a-spin size="large" />
        <p class="result-loading-text">Generating content...</p>
      </div>

      <div v-else-if="result" class="result-area">
        <div class="result-header">
          <span class="result-label">Generated Result</span>
          <div class="result-actions">
            <a-tooltip title="Copy to clipboard">
              <button class="result-action-btn" @click="copyToClipboard">
                <Copy :size="13" />
              </button>
            </a-tooltip>
            <a-tooltip title="Regenerate">
              <button class="result-action-btn" @click="regenerate">
                <RefreshCw :size="13" />
              </button>
            </a-tooltip>
          </div>
        </div>
        <div :class="['result-content', isCodeMode && 'result-content--code']">
          <pre v-if="isCodeMode">{{ result }}</pre>
          <p v-else>{{ result }}</p>
        </div>

        <!-- Apply button -->
        <div class="result-footer">
          <a-button @click="handleClose">Cancel</a-button>
          <a-button type="primary" @click="apply">
            Apply to Field
          </a-button>
        </div>
      </div>

      <!-- Empty state hint -->
      <div v-else class="result-hint">
        <Wand2 :size="28" class="hint-icon" />
        <p>Enter a prompt and click <strong>Generate</strong> to create content with AI.</p>
        <p class="hint-tip">Tip: Be specific about context, style, and audience for best results.</p>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.ai-modal-header {
  padding: 4px 0 16px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.ai-modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.ai-icon {
  color: #7c3aed;
}

.ai-modal-subtitle {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

.ai-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-group--inline {
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

.options-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.result-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.result-loading-text {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.result-area {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.result-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.result-actions {
  display: flex;
  gap: 4px;
}

.result-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s;
}

.result-action-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
  background: #f0f5ff;
}

.result-content {
  padding: 12px;
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
}

.result-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
}

.result-content--code {
  background: #1e1e2e;
}

.result-content--code pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #cdd6f4;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: 'Fira Code', 'Consolas', monospace;
}

.result-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 12px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.result-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  gap: 8px;
}

.hint-icon {
  color: #d1d5db;
  margin-bottom: 4px;
}

.result-hint p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.result-hint p strong {
  color: #374151;
}

.hint-tip {
  font-size: 12px !important;
  color: #9ca3af !important;
}
</style>
