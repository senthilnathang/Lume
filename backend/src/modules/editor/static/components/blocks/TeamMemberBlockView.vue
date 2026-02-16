<script setup lang="ts">
import { computed } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';
import { GripVertical, Trash2, Users, User, Globe, Mail } from 'lucide-vue-next';

const props = defineProps(nodeViewProps);

const socialLinks = computed(() => {
  const raw = props.node.attrs.socialLinks;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
});

const initials = computed(() => {
  const name = props.node.attrs.name || 'John Doe';
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
});

function selectThisNode() {
  const pos = props.getPos();
  if (typeof pos === 'number') {
    props.editor.commands.setNodeSelection(pos);
  }
}
</script>

<template>
  <NodeViewWrapper class="team-member-block-wrapper" :class="{ 'is-selected': selected }" data-type="teamMember">
    <div class="block-controls" contenteditable="false">
      <div class="block-drag-handle" data-drag-handle>
        <GripVertical :size="14" />
      </div>
      <span class="block-label"><Users :size="12" /> Team Member</span>
      <button class="block-delete" @click="deleteNode">
        <Trash2 :size="14" />
      </button>
    </div>
    <div contenteditable="false" class="team-member-preview" @click="selectThisNode">
      <div class="member-avatar">
        <img v-if="node.attrs.image" :src="node.attrs.image" :alt="node.attrs.name" class="member-image" />
        <div v-else class="member-initials">{{ initials }}</div>
      </div>
      <h4 class="member-name">{{ node.attrs.name || 'John Doe' }}</h4>
      <p class="member-role">{{ node.attrs.role || 'Team Member' }}</p>
      <p v-if="node.attrs.bio" class="member-bio">{{ node.attrs.bio }}</p>
      <div v-if="socialLinks.length > 0" class="member-socials">
        <a v-for="(link, idx) in socialLinks" :key="idx" class="social-link" href="#">
          <Globe :size="16" />
        </a>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.team-member-block-wrapper {
  position: relative;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: border-color 0.15s;
  margin: 8px 0;
  padding: 8px;
  max-width: 300px;
}
.team-member-block-wrapper:hover { border-color: #d1d5db; }
.team-member-block-wrapper.is-selected { border-color: #1677ff; }
.block-controls {
  position: absolute; top: -1px; left: -1px; right: -1px;
  display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity 0.15s; z-index: 10; pointer-events: none;
}
.team-member-block-wrapper:hover .block-controls,
.team-member-block-wrapper.is-selected .block-controls {
  opacity: 1; pointer-events: all;
}
.block-drag-handle { cursor: grab; padding: 4px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; color: #6b7280; }
.block-drag-handle:hover { background: #e5e7eb; }
.block-label { font-size: 11px; color: #6b7280; background: #f3f4f6; padding: 2px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; user-select: none; }
.block-delete { margin-left: auto; cursor: pointer; padding: 4px; background: #fef2f2; border: none; border-radius: 4px; color: #ef4444; display: flex; align-items: center; }
.block-delete:hover { background: #fee2e2; }

.team-member-preview {
  text-align: center;
  padding: 24px 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.member-avatar {
  margin: 0 auto 16px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
}
.member-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.member-initials {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dbeafe;
  color: #3b82f6;
  font-size: 24px;
  font-weight: 700;
}
.member-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}
.member-role {
  margin: 0 0 12px;
  font-size: 13px;
  color: #6b7280;
}
.member-bio {
  margin: 0 0 16px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
}
.member-socials {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.social-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #6b7280;
  text-decoration: none;
  transition: all 0.15s;
}
.social-link:hover {
  background: #e5e7eb;
  color: #374151;
}
</style>
