<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { get } from '@/api/request';

const props = withDefaults(defineProps<{
  globalWidgetId?: number | null;
  name?: string;
}>(), {
  globalWidgetId: null,
  name: 'Global Widget',
});

const loading = ref(false);
const widgetContent = ref<any>(null);
const error = ref<string | null>(null);

async function fetchWidget() {
  if (!props.globalWidgetId) return;
  loading.value = true;
  error.value = null;
  try {
    const result = await get(`/editor/global-widgets/${props.globalWidgetId}`);
    const data = result?.data || result;
    if (data && data.content) {
      try {
        widgetContent.value = typeof data.content === 'string'
          ? JSON.parse(data.content)
          : data.content;
      } catch {
        widgetContent.value = data.content;
      }
    }
  } catch (err: any) {
    error.value = 'Failed to load global widget';
    console.error('[GlobalWidgetRender] Error loading widget:', err);
  } finally {
    loading.value = false;
  }
}

// Render a single TipTap content node as HTML
function renderNode(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let text = node.text || '';
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        else if (mark.type === 'italic') text = `<em>${text}</em>`;
        else if (mark.type === 'underline') text = `<u>${text}</u>`;
        else if (mark.type === 'strike') text = `<s>${text}</s>`;
        else if (mark.type === 'code') text = `<code>${text}</code>`;
        else if (mark.type === 'link') {
          const href = mark.attrs?.href || '#';
          text = `<a href="${href}">${text}</a>`;
        }
      }
    }
    return text;
  }
  const children = (node.content || []).map(renderNode).join('');
  switch (node.type) {
    case 'doc': return children;
    case 'paragraph': return `<p>${children}</p>`;
    case 'heading': return `<h${node.attrs?.level || 2}>${children}</h${node.attrs?.level || 2}>`;
    case 'bulletList': return `<ul>${children}</ul>`;
    case 'orderedList': return `<ol>${children}</ol>`;
    case 'listItem': return `<li>${children}</li>`;
    case 'blockquote': return `<blockquote>${children}</blockquote>`;
    case 'codeBlock': return `<pre><code>${children}</code></pre>`;
    case 'horizontalRule': return '<hr />';
    case 'hardBreak': return '<br />';
    default: return children;
  }
}

const renderedHtml = computed(() => {
  if (!widgetContent.value) return '';
  try {
    if (typeof widgetContent.value === 'object' && widgetContent.value.type === 'doc') {
      return renderNode(widgetContent.value);
    }
    return String(widgetContent.value);
  } catch {
    return '';
  }
});

onMounted(fetchWidget);
</script>

<template>
  <div class="global-widget-render">
    <!-- Loading state -->
    <div v-if="loading" class="gwr-loading">
      <div class="gwr-spinner" />
      <span class="gwr-loading-text">Loading {{ name }}...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="gwr-error">
      <span>{{ error }}</span>
    </div>

    <!-- No widget ID -->
    <div v-else-if="!globalWidgetId" class="gwr-placeholder">
      <span>Global Widget (not configured)</span>
    </div>

    <!-- Rendered content -->
    <div v-else-if="renderedHtml" class="gwr-content" v-html="renderedHtml" />

    <!-- Empty content fallback -->
    <div v-else class="gwr-placeholder">
      <span>{{ name }} (empty content)</span>
    </div>
  </div>
</template>

<style scoped>
.global-widget-render {
  display: block;
}
.gwr-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  color: #6b7280;
  font-size: 13px;
}
.gwr-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: gwr-spin 0.8s linear infinite;
}
@keyframes gwr-spin {
  to { transform: rotate(360deg); }
}
.gwr-loading-text {
  color: #9ca3af;
  font-size: 12px;
}
.gwr-error {
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #b91c1c;
  font-size: 12px;
}
.gwr-placeholder {
  padding: 10px 14px;
  background: #eff6ff;
  border: 1.5px dashed #93c5fd;
  border-radius: 6px;
  color: #3b82f6;
  font-size: 12px;
  font-style: italic;
}
.gwr-content {
  display: block;
}
</style>
