<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Share2, Facebook, Twitter, Linkedin, Instagram, Youtube, Github, Globe, Mail } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const platformIconMap: Record<string, any> = {
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  instagram: Instagram,
  youtube: Youtube,
  github: Github,
  website: Globe,
  email: Mail,
};

const platformColors: Record<string, string> = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  github: '#333333',
  website: '#6b7280',
  email: '#ea4335',
};

const platforms = computed(() => {
  const raw = props.node.attrs.platforms;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

const defaultPlatforms = ['facebook', 'twitter', 'linkedin', 'instagram'];
const displayPlatforms = computed(() => platforms.value.length > 0 ? platforms.value : defaultPlatforms);

function getIcon(platform: string) {
  const name = typeof platform === 'string' ? platform : (platform as any).name || '';
  return platformIconMap[name.toLowerCase()] || Globe;
}

function getColor(platform: string) {
  const name = typeof platform === 'string' ? platform : (platform as any).name || '';
  return platformColors[name.toLowerCase()] || '#6b7280';
}

function getName(platform: string | { name: string }) {
  return typeof platform === 'string' ? platform : platform.name || '';
}

const sizeClass = computed(() => `size-${props.node.attrs.size || 'md'}`);
const styleType = computed(() => props.node.attrs.style || 'icon');

const wrapperStyles = computed(() => ({
  justifyContent: props.node.attrs.alignment === 'center' ? 'center' :
                   props.node.attrs.alignment === 'right' ? 'flex-end' : 'flex-start',
}));

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="social-share-block-wrapper" :class="{ 'is-selected': selected }" data-type="socialShare">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Share2 :size="12" /> Social Share</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="social-share-preview" :style="wrapperStyles" @click="selectThisNode">
      <template v-for="(platform, idx) in displayPlatforms" :key="idx">
        <span
          v-if="styleType === 'button' || styleType === 'icon-text'"
          class="social-btn"
          :class="sizeClass"
          :style="{ backgroundColor: getColor(platform), color: '#fff' }"
        >
          <component :is="getIcon(platform)" :size="16" />
          <span v-if="styleType === 'icon-text'" class="social-btn-text">{{ getName(platform) }}</span>
        </span>
        <span
          v-else
          class="social-icon-only"
          :class="sizeClass"
          :style="{ color: getColor(platform) }"
        >
          <component :is="getIcon(platform)" :size="20" />
        </span>
      </template>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.social-share-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
}
.social-share-block-wrapper:hover { border-color: #d1d5db; }
.social-share-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.social-share-block-wrapper:hover .block-controls,
.social-share-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.social-share-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 0;
}
.social-icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: opacity 0.15s;
}
.social-icon-only.size-sm { width: 28px; height: 28px; }
.social-icon-only.size-md { width: 36px; height: 36px; }
.social-icon-only.size-lg { width: 44px; height: 44px; }
.social-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  cursor: default;
  font-weight: 500;
  text-transform: capitalize;
}
.social-btn.size-sm { padding: 6px 12px; font-size: 12px; }
.social-btn.size-md { padding: 8px 16px; font-size: 13px; }
.social-btn.size-lg { padding: 10px 20px; font-size: 14px; }
.social-btn-text {
  line-height: 1;
}
</style>
