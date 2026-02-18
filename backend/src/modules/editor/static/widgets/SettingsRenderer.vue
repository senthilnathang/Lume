<template>
  <div class="settings-renderer">
    <!-- Device toggle for responsive editing -->
    <div class="device-toggle">
      <button :class="['device-btn', activeDevice === 'desktop' && 'active']" title="Desktop" @click="activeDevice = 'desktop'">
        <Monitor :size="14" />
      </button>
      <button :class="['device-btn', activeDevice === 'tablet' && 'active']" title="Tablet" @click="activeDevice = 'tablet'">
        <Tablet :size="14" />
      </button>
      <button :class="['device-btn', activeDevice === 'mobile' && 'active']" title="Mobile" @click="activeDevice = 'mobile'">
        <Smartphone :size="14" />
      </button>
    </div>

    <a-tabs v-if="visibleSections.length > 1" v-model:activeKey="activeSection" size="small">
      <a-tab-pane v-for="section in visibleSections" :key="section" :tab="sectionLabels[section]">
        <div class="settings-section">
          <div
            v-for="attr in sectionAttributes[section]"
            :key="attr.key"
            class="setting-group"
          >
            <label class="setting-label">{{ attr.label }}</label>

            <!-- Text input -->
            <a-input
              v-if="attr.type === 'text'"
              :value="values[attr.key]"
              size="small"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Textarea -->
            <a-textarea
              v-else-if="attr.type === 'textarea'"
              :value="values[attr.key]"
              size="small"
              :rows="3"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Number input -->
            <a-input-number
              v-else-if="attr.type === 'number'"
              :value="values[attr.key]"
              size="small"
              :min="attr.min"
              :max="attr.max"
              :step="attr.step || 1"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Slider -->
            <a-slider
              v-else-if="attr.type === 'slider'"
              :value="values[attr.key]"
              :min="attr.min || 0"
              :max="attr.max || 100"
              :step="attr.step || 1"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Color picker -->
            <a-input
              v-else-if="attr.type === 'color'"
              :value="values[attr.key]"
              type="color"
              size="small"
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Select dropdown -->
            <a-select
              v-else-if="attr.type === 'select'"
              :value="values[attr.key]"
              size="small"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            >
              <a-select-option
                v-for="option in attr.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </a-select-option>
            </a-select>

            <!-- Switch -->
            <a-switch
              v-else-if="attr.type === 'switch'"
              :checked="values[attr.key]"
              size="small"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Image input with preview -->
            <div v-else-if="attr.type === 'image'">
              <a-input
                :value="values[attr.key]"
                size="small"
                placeholder="https://..."
                @change="handleChange(attr.key, $event.target.value)"
              />
              <img
                v-if="values[attr.key]"
                :src="values[attr.key]"
                class="image-preview"
                alt="Preview"
              />
            </div>

            <!-- URL input -->
            <a-input
              v-else-if="attr.type === 'url'"
              :value="values[attr.key]"
              size="small"
              placeholder="https://..."
              @change="handleChange(attr.key, $event.target.value)"
            />

            <!-- Alignment buttons -->
            <div v-else-if="attr.type === 'alignment'" class="alignment-group">
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'left' }]"
                @click="handleChange(attr.key, 'left')"
              >
                <AlignLeft :size="16" />
              </button>
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'center' }]"
                @click="handleChange(attr.key, 'center')"
              >
                <AlignCenter :size="16" />
              </button>
              <button
                :class="['alignment-btn', { active: values[attr.key] === 'right' }]"
                @click="handleChange(attr.key, 'right')"
              >
                <AlignRight :size="16" />
              </button>
            </div>

            <!-- Date picker -->
            <a-date-picker
              v-else-if="attr.type === 'date'"
              :value="values[attr.key]"
              size="small"
              style="width: 100%"
              @change="handleChange(attr.key, $event)"
            />

            <!-- Spacing inputs -->
            <div v-else-if="attr.type === 'spacing'" class="spacing-group">
              <a-input-number
                :value="parseSpacing(values[attr.key])[0]"
                size="small"
                placeholder="Top"
                @change="handleSpacingChange(attr.key, 0, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[1]"
                size="small"
                placeholder="Right"
                @change="handleSpacingChange(attr.key, 1, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[2]"
                size="small"
                placeholder="Bottom"
                @change="handleSpacingChange(attr.key, 2, $event)"
              />
              <a-input-number
                :value="parseSpacing(values[attr.key])[3]"
                size="small"
                placeholder="Left"
                @change="handleSpacingChange(attr.key, 3, $event)"
              />
            </div>

            <!-- Repeater -->
            <div v-else-if="attr.type === 'repeater'" class="repeater-group">
              <div
                v-for="(item, index) in (values[attr.key] || [])"
                :key="index"
                class="repeater-item"
              >
                <div class="repeater-item-header">
                  <span class="repeater-item-title">Item {{ index + 1 }}</span>
                  <button class="repeater-delete-btn" @click="handleRepeaterDelete(attr.key, index)">
                    <Trash2 :size="14" />
                  </button>
                </div>
                <div class="repeater-item-content">
                  <div
                    v-for="childAttr in attr.children"
                    :key="childAttr.key"
                    class="setting-group"
                  >
                    <label class="setting-label">{{ childAttr.label }}</label>
                    <a-input
                      v-if="childAttr.type === 'text'"
                      :value="item[childAttr.key]"
                      size="small"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-textarea
                      v-else-if="childAttr.type === 'textarea'"
                      :value="item[childAttr.key]"
                      size="small"
                      :rows="2"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-input-number
                      v-else-if="childAttr.type === 'number'"
                      :value="item[childAttr.key]"
                      size="small"
                      style="width: 100%"
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event)"
                    />
                    <a-input
                      v-else-if="childAttr.type === 'image'"
                      :value="item[childAttr.key]"
                      size="small"
                      placeholder="https://..."
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                    <a-input
                      v-else-if="childAttr.type === 'url'"
                      :value="item[childAttr.key]"
                      size="small"
                      placeholder="https://..."
                      @change="handleRepeaterChange(attr.key, index, childAttr.key, $event.target.value)"
                    />
                  </div>
                </div>
              </div>
              <button class="repeater-add-btn" @click="handleRepeaterAdd(attr)">
                <Plus :size="14" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>

    <!-- Single section without tabs -->
    <div v-else-if="visibleSections.length === 1" class="settings-section">
      <div
        v-for="attr in sectionAttributes[visibleSections[0]]"
        :key="attr.key"
        class="setting-group"
      >
        <label class="setting-label">{{ attr.label }}</label>

        <a-input v-if="attr.type === 'text'" :value="values[attr.key]" size="small" @change="handleChange(attr.key, $event.target.value)" />
        <a-textarea v-else-if="attr.type === 'textarea'" :value="values[attr.key]" size="small" :rows="3" @change="handleChange(attr.key, $event.target.value)" />
        <a-input-number v-else-if="attr.type === 'number'" :value="values[attr.key]" size="small" :min="attr.min" :max="attr.max" :step="attr.step || 1" style="width: 100%" @change="handleChange(attr.key, $event)" />
        <a-slider v-else-if="attr.type === 'slider'" :value="values[attr.key]" :min="attr.min || 0" :max="attr.max || 100" :step="attr.step || 1" @change="handleChange(attr.key, $event)" />
        <a-input v-else-if="attr.type === 'color'" :value="values[attr.key]" type="color" size="small" @change="handleChange(attr.key, $event.target.value)" />
        <a-select v-else-if="attr.type === 'select'" :value="values[attr.key]" size="small" style="width: 100%" @change="handleChange(attr.key, $event)">
          <a-select-option v-for="option in attr.options" :key="option.value" :value="option.value">{{ option.label }}</a-select-option>
        </a-select>
        <a-switch v-else-if="attr.type === 'switch'" :checked="values[attr.key]" size="small" @change="handleChange(attr.key, $event)" />
        <div v-else-if="attr.type === 'image'">
          <a-input :value="values[attr.key]" size="small" placeholder="https://..." @change="handleChange(attr.key, $event.target.value)" />
          <img v-if="values[attr.key]" :src="values[attr.key]" class="image-preview" alt="Preview" />
        </div>
        <a-input v-else-if="attr.type === 'url'" :value="values[attr.key]" size="small" placeholder="https://..." @change="handleChange(attr.key, $event.target.value)" />
        <div v-else-if="attr.type === 'alignment'" class="alignment-group">
          <button :class="['alignment-btn', { active: values[attr.key] === 'left' }]" @click="handleChange(attr.key, 'left')"><AlignLeft :size="16" /></button>
          <button :class="['alignment-btn', { active: values[attr.key] === 'center' }]" @click="handleChange(attr.key, 'center')"><AlignCenter :size="16" /></button>
          <button :class="['alignment-btn', { active: values[attr.key] === 'right' }]" @click="handleChange(attr.key, 'right')"><AlignRight :size="16" /></button>
        </div>
        <a-date-picker v-else-if="attr.type === 'date'" :value="values[attr.key]" size="small" style="width: 100%" @change="handleChange(attr.key, $event)" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Plus, Monitor, Tablet, Smartphone } from 'lucide-vue-next';

interface AttrSchema {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'slider' | 'color' | 'select' | 'switch' | 'image' | 'url' | 'alignment' | 'spacing' | 'repeater' | 'date';
  section: 'content' | 'style' | 'advanced';
  options?: { value: string; label: string }[];
  default?: any;
  min?: number;
  max?: number;
  step?: number;
  children?: AttrSchema[];
}

const props = defineProps<{
  attributes: AttrSchema[];
  values: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: 'update', key: string, value: any): void;
}>();

const activeSection = ref<string>('content');
const activeDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');

const sectionLabels: Record<string, string> = {
  content: 'Content',
  style: 'Style',
  advanced: 'Advanced'
};

// Responsive overrides — stored as JSON in 'responsiveOverrides' attr
const responsiveOverrides = computed(() => {
  const raw = props.values.responsiveOverrides;
  if (!raw || raw === '{}') return {};
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return {}; }
});

function getEffectiveValue(key: string): any {
  if (activeDevice.value === 'desktop') return props.values[key];
  const overrides = responsiveOverrides.value[activeDevice.value] || {};
  return key in overrides ? overrides[key] : props.values[key];
}

function isOverridden(key: string): boolean {
  if (activeDevice.value === 'desktop') return false;
  const overrides = responsiveOverrides.value[activeDevice.value] || {};
  return key in overrides;
}

// Style-section attrs that support responsive overrides
const responsiveKeys = new Set([
  'alignment', 'fontSize', 'paddingTop', 'paddingBottom', 'maxWidth',
  'gap', 'columns', 'width', 'height', 'iconSize', 'size',
]);

function handleResponsiveChange(key: string, value: any) {
  if (activeDevice.value === 'desktop') {
    emit('update', key, value);
    return;
  }
  // Store as responsive override
  const current = { ...responsiveOverrides.value };
  if (!current[activeDevice.value]) current[activeDevice.value] = {};
  current[activeDevice.value][key] = value;
  emit('update', 'responsiveOverrides', JSON.stringify(current));
}

const sectionAttributes = computed(() => {
  const sections: Record<string, AttrSchema[]> = {
    content: [],
    style: [],
    advanced: []
  };

  // Internal attrs managed programmatically — hide from UI
  const hiddenKeys = new Set(['responsiveOverrides', 'displayConditions']);

  props.attributes.forEach(attr => {
    if (hiddenKeys.has(attr.key)) return;
    if (sections[attr.section]) {
      sections[attr.section].push(attr);
    }
  });

  return sections;
});

const visibleSections = computed(() => {
  return Object.keys(sectionAttributes.value).filter(
    section => sectionAttributes.value[section].length > 0
  );
});

const handleChange = (key: string, value: any) => {
  emit('update', key, value);
};

const parseSpacing = (value: string): number[] => {
  if (!value) return [0, 0, 0, 0];
  const parts = value.split(' ').map(v => parseInt(v) || 0);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return parts.slice(0, 4);
};

const handleSpacingChange = (key: string, index: number, value: number) => {
  const current = parseSpacing(props.values[key]);
  current[index] = value || 0;
  emit('update', key, current.join(' '));
};

const handleRepeaterAdd = (attr: AttrSchema) => {
  const current = props.values[attr.key] || [];
  const newItem: Record<string, any> = {};

  // Initialize with defaults from children schema
  attr.children?.forEach(child => {
    newItem[child.key] = child.default ?? '';
  });

  emit('update', attr.key, [...current, newItem]);
};

const handleRepeaterDelete = (key: string, index: number) => {
  const current = [...(props.values[key] || [])];
  current.splice(index, 1);
  emit('update', key, current);
};

const handleRepeaterChange = (key: string, index: number, childKey: string, value: any) => {
  const current = [...(props.values[key] || [])];
  current[index] = { ...current[index], [childKey]: value };
  emit('update', key, current);
};
</script>

<style scoped>
.settings-renderer {
  width: 100%;
}

.device-toggle {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 6px 0 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 4px;
}

.device-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 28px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.15s;
}

.device-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.device-btn.active {
  border-color: #4096ff;
  background: #e6f4ff;
  color: #4096ff;
}

.settings-section {
  padding: 8px 0;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}

.image-preview {
  margin-top: 8px;
  max-width: 100%;
  max-height: 120px;
  border-radius: 4px;
  border: 1px solid #e5e7eb;
}

.alignment-group {
  display: flex;
  gap: 4px;
}

.alignment-btn {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.alignment-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}

.alignment-btn.active {
  border-color: #4096ff;
  background: #e6f4ff;
  color: #4096ff;
}

.spacing-group {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.repeater-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repeater-item {
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 8px;
  background: #fafafa;
}

.repeater-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.repeater-item-title {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.repeater-delete-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.repeater-delete-btn:hover {
  background: #fee2e2;
}

.repeater-item-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.repeater-item-content .setting-group {
  margin-bottom: 0;
}

.repeater-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #6b7280;
  transition: all 0.2s;
}

.repeater-add-btn:hover {
  border-color: #4096ff;
  color: #4096ff;
}
</style>
