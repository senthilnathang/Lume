<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Mail } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const fields = computed(() => {
  const raw = props.node.attrs.fields;
  if (Array.isArray(raw) && raw.length > 0) return raw;
  return [
    { label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
    { label: 'Email', type: 'email', required: true, placeholder: 'your@email.com' },
    { label: 'Message', type: 'textarea', required: true, placeholder: 'Your message...' },
  ];
});

const submitText = computed(() => props.node.attrs.submitText || 'Send Message');

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="contact-form-block-wrapper" :class="{ 'is-selected': selected }" data-type="contactForm">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle><GripVertical :size="14" /></div>
      <span class="block-label"><Mail :size="12" /> Contact Form</span>
      <button class="block-delete" @click="deleteNode"><Trash2 :size="14" /></button>
    </div>
    <div class="form-preview" contenteditable="false" @click="selectThisNode">
      <div v-for="(field, index) in fields" :key="index" class="form-field">
        <label class="form-field-label">
          {{ field.label }}
          <span v-if="field.required" class="form-required">*</span>
        </label>
        <textarea
          v-if="field.type === 'textarea'"
          class="form-field-input form-textarea"
          :placeholder="field.placeholder || ''"
          disabled
        ></textarea>
        <input
          v-else
          class="form-field-input"
          :type="field.type || 'text'"
          :placeholder="field.placeholder || ''"
          disabled
        />
      </div>
      <div class="form-submit">
        <span class="form-submit-btn">{{ submitText }}</span>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.contact-form-block-wrapper { position: relative; border: 2px dashed transparent; border-radius: 4px; transition: border-color 0.15s; margin: 8px 0; padding: 8px; }
.contact-form-block-wrapper:hover { border-color: #d1d5db; }
.contact-form-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls { position: absolute; top: -1px; left: -1px; right: -1px; display: flex; align-items: center; gap: 4px; opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none; }
.contact-form-block-wrapper:hover .block-controls, .contact-form-block-wrapper.is-selected .block-controls { opacity: 1; pointer-events: all; }
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.form-preview { padding: 16px; background: #f9fafb; border-radius: 8px; }
.form-field { margin-bottom: 14px; }
.form-field-label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 4px; }
.form-required { color: #ef4444; }
.form-field-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; background: white; color: #9ca3af; box-sizing: border-box; }
.form-textarea { min-height: 80px; resize: none; }
.form-submit { margin-top: 16px; }
.form-submit-btn { display: inline-block; padding: 10px 24px; background: #1677ff; color: white; border-radius: 6px; font-weight: 600; font-size: 14px; cursor: default; }
</style>
