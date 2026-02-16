<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Settings2 } from 'lucide-vue-next';

const props = defineProps<{
  editor: any;
}>();

const activeBlock = ref<string | null>(null);
const blockAttrs = ref<Record<string, any>>({});

// List of custom block types we manage settings for
const managedBlocks = [
  'sectionBlock', 'columnsBlock', 'imageBlock', 'buttonBlock',
  'spacerBlock', 'videoBlock', 'calloutBlock', 'htmlBlock',
];

// Watch editor selection changes
watch(
  () => props.editor?.state?.selection,
  () => {
    if (!props.editor) return;
    // Find which custom block is active
    const found = managedBlocks.find(name => props.editor.isActive(name));
    if (found) {
      activeBlock.value = found;
      blockAttrs.value = { ...props.editor.getAttributes(found) };
    } else {
      activeBlock.value = null;
      blockAttrs.value = {};
    }
  },
  { deep: true }
);

function updateAttr(key: string, value: any) {
  if (!props.editor || !activeBlock.value) return;
  props.editor.chain().focus().updateAttributes(activeBlock.value, { [key]: value }).run();
  blockAttrs.value[key] = value;
}

const calloutTypes = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'success', label: 'Success' },
  { value: 'error', label: 'Error' },
];

const buttonVariants = [
  { value: 'primary', label: 'Primary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'danger', label: 'Danger' },
];

const buttonSizes = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

const alignmentOptions = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const aspectRatios = [
  { value: '16:9', label: '16:9' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' },
];

const blockLabels: Record<string, string> = {
  sectionBlock: 'Section',
  columnsBlock: 'Columns',
  imageBlock: 'Image',
  buttonBlock: 'Button',
  spacerBlock: 'Spacer',
  videoBlock: 'Video',
  calloutBlock: 'Callout',
  htmlBlock: 'HTML',
};
</script>

<template>
  <div class="block-settings">
    <div class="settings-header">
      <Settings2 :size="14" />
      <h4>{{ activeBlock ? blockLabels[activeBlock] || 'Block' : 'Block' }} Settings</h4>
    </div>

    <div v-if="!activeBlock" class="settings-empty">
      <p>Select a block to edit its settings</p>
    </div>

    <div v-else class="settings-content">
      <!-- Section Settings -->
      <template v-if="activeBlock === 'sectionBlock'">
        <div class="setting-group">
          <label>Background Color</label>
          <a-input
            :value="blockAttrs.backgroundColor"
            type="color"
            size="small"
            @change="(e: any) => updateAttr('backgroundColor', e.target.value)"
          />
        </div>
        <div class="setting-group">
          <label>Background Image URL</label>
          <a-input
            :value="blockAttrs.backgroundImage"
            size="small"
            placeholder="https://..."
            @change="(e: any) => updateAttr('backgroundImage', e.target.value)"
          />
        </div>
        <div class="setting-group">
          <label>Padding Top (px)</label>
          <a-slider :value="Number(blockAttrs.paddingTop)" :min="0" :max="200" @change="(v: number) => updateAttr('paddingTop', String(v))" />
        </div>
        <div class="setting-group">
          <label>Padding Bottom (px)</label>
          <a-slider :value="Number(blockAttrs.paddingBottom)" :min="0" :max="200" @change="(v: number) => updateAttr('paddingBottom', String(v))" />
        </div>
        <div class="setting-group">
          <label>Max Width (px)</label>
          <a-slider :value="Number(blockAttrs.maxWidth)" :min="600" :max="1600" :step="50" @change="(v: number) => updateAttr('maxWidth', String(v))" />
        </div>
      </template>

      <!-- Columns Settings -->
      <template v-if="activeBlock === 'columnsBlock'">
        <div class="setting-group">
          <label>Gap (px)</label>
          <a-slider :value="Number(blockAttrs.gap)" :min="0" :max="60" @change="(v: number) => updateAttr('gap', String(v))" />
        </div>
        <div class="setting-group">
          <label>Layout</label>
          <a-select :value="blockAttrs.layout" size="small" style="width: 100%" @change="(v: string) => updateAttr('layout', v)">
            <a-select-option value="equal">Equal</a-select-option>
            <a-select-option value="1-2">1/3 + 2/3</a-select-option>
            <a-select-option value="2-1">2/3 + 1/3</a-select-option>
          </a-select>
        </div>
      </template>

      <!-- Image Settings -->
      <template v-if="activeBlock === 'imageBlock'">
        <div class="setting-group">
          <label>Image URL</label>
          <a-input :value="blockAttrs.src" size="small" placeholder="https://..." @change="(e: any) => updateAttr('src', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Alt Text</label>
          <a-input :value="blockAttrs.alt" size="small" placeholder="Describe the image" @change="(e: any) => updateAttr('alt', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Caption</label>
          <a-input :value="blockAttrs.caption" size="small" placeholder="Image caption" @change="(e: any) => updateAttr('caption', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Alignment</label>
          <a-select :value="blockAttrs.alignment" size="small" style="width: 100%" @change="(v: string) => updateAttr('alignment', v)">
            <a-select-option v-for="o in alignmentOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
            <a-select-option value="full">Full Width</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Width</label>
          <a-input :value="blockAttrs.width" size="small" placeholder="100%" @change="(e: any) => updateAttr('width', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Link URL</label>
          <a-input :value="blockAttrs.link" size="small" placeholder="Optional link..." @change="(e: any) => updateAttr('link', e.target.value)" />
        </div>
      </template>

      <!-- Button Settings -->
      <template v-if="activeBlock === 'buttonBlock'">
        <div class="setting-group">
          <label>Button Text</label>
          <a-input :value="blockAttrs.text" size="small" @change="(e: any) => updateAttr('text', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>URL</label>
          <a-input :value="blockAttrs.url" size="small" placeholder="https://..." @change="(e: any) => updateAttr('url', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Style</label>
          <a-select :value="blockAttrs.variant" size="small" style="width: 100%" @change="(v: string) => updateAttr('variant', v)">
            <a-select-option v-for="o in buttonVariants" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Size</label>
          <a-select :value="blockAttrs.size" size="small" style="width: 100%" @change="(v: string) => updateAttr('size', v)">
            <a-select-option v-for="o in buttonSizes" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Alignment</label>
          <a-select :value="blockAttrs.alignment" size="small" style="width: 100%" @change="(v: string) => updateAttr('alignment', v)">
            <a-select-option v-for="o in alignmentOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Full Width</label>
          <a-switch :checked="blockAttrs.fullWidth" @change="(v: boolean) => updateAttr('fullWidth', v)" />
        </div>
      </template>

      <!-- Spacer Settings -->
      <template v-if="activeBlock === 'spacerBlock'">
        <div class="setting-group">
          <label>Height (px)</label>
          <a-slider :value="Number(blockAttrs.height)" :min="8" :max="300" @change="(v: number) => updateAttr('height', String(v))" />
        </div>
      </template>

      <!-- Video Settings -->
      <template v-if="activeBlock === 'videoBlock'">
        <div class="setting-group">
          <label>Video URL</label>
          <a-input :value="blockAttrs.src" size="small" placeholder="YouTube or Vimeo URL" @change="(e: any) => updateAttr('src', e.target.value)" />
        </div>
        <div class="setting-group">
          <label>Aspect Ratio</label>
          <a-select :value="blockAttrs.aspectRatio" size="small" style="width: 100%" @change="(v: string) => updateAttr('aspectRatio', v)">
            <a-select-option v-for="o in aspectRatios" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Autoplay</label>
          <a-switch :checked="blockAttrs.autoplay" @change="(v: boolean) => updateAttr('autoplay', v)" />
        </div>
      </template>

      <!-- Callout Settings -->
      <template v-if="activeBlock === 'calloutBlock'">
        <div class="setting-group">
          <label>Type</label>
          <a-select :value="blockAttrs.type" size="small" style="width: 100%" @change="(v: string) => updateAttr('type', v)">
            <a-select-option v-for="o in calloutTypes" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="setting-group">
          <label>Title</label>
          <a-input :value="blockAttrs.title" size="small" placeholder="Optional title" @change="(e: any) => updateAttr('title', e.target.value)" />
        </div>
      </template>

      <!-- HTML Settings -->
      <template v-if="activeBlock === 'htmlBlock'">
        <div class="setting-group">
          <label>HTML Content</label>
          <a-textarea
            :value="blockAttrs.content"
            :rows="8"
            placeholder="Enter HTML..."
            style="font-family: 'SF Mono', Monaco, Menlo, monospace; font-size: 12px;"
            @change="(e: any) => updateAttr('content', e.target.value)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.block-settings {
  width: 260px;
  border-left: 1px solid #e5e7eb;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.settings-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 8px;
}
.settings-header h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.settings-empty {
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}
.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.setting-group {
  margin-bottom: 16px;
}
.setting-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 4px;
}
</style>
