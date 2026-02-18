<script setup lang="ts">
import { ref, computed } from 'vue';
import '../widget-styles.css';

const props = withDefaults(defineProps<{
  code?: string;
  language?: string;
  theme?: string;
  lineNumbers?: boolean;
  copyButton?: boolean;
  maxHeight?: number;
}>(), {
  code: '',
  language: 'javascript',
  theme: 'dark',
  lineNumbers: true,
  copyButton: true,
  maxHeight: 400,
});

const copied = ref(false);

const codeLines = computed(() => props.code.split('\n'));

async function copyCode() {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch { /* clipboard not available */ }
}
</script>

<template>
  <div class="lume-code-highlight" :class="`lume-code--${theme}`">
    <div class="lume-code-header">
      <div class="lume-code-dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
      <span class="lume-code-lang">{{ language }}</span>
      <button v-if="copyButton" class="lume-code-copy" @click="copyCode">
        {{ copied ? 'Copied!' : 'Copy' }}
      </button>
    </div>
    <div class="lume-code-body" :style="{ maxHeight: maxHeight + 'px' }">
      <table class="lume-code-table">
        <tbody>
          <tr v-for="(line, i) in codeLines" :key="i">
            <td v-if="lineNumbers" class="lume-code-line-num">{{ i + 1 }}</td>
            <td class="lume-code-line"><pre>{{ line }}</pre></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.lume-code-highlight {
  border-radius: 8px;
  overflow: hidden;
  font-family: 'SF Mono', Monaco, Menlo, 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}
.lume-code--dark { background: #1e1e2e; color: #cdd6f4; }
.lume-code--light { background: #f8f9fa; color: #24292e; border: 1px solid #e1e4e8; }

.lume-code-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
}
.lume-code--dark .lume-code-header { border-bottom: 1px solid rgba(255,255,255,0.08); }
.lume-code--light .lume-code-header { border-bottom: 1px solid #e1e4e8; }

.lume-code-dots {
  display: flex;
  gap: 6px;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.lume-code--dark .dot:nth-child(1) { background: #ff5f57; }
.lume-code--dark .dot:nth-child(2) { background: #febc2e; }
.lume-code--dark .dot:nth-child(3) { background: #28c840; }
.lume-code--light .dot { background: #d1d5da; }

.lume-code-lang {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.6;
  flex: 1;
}
.lume-code-copy {
  padding: 4px 12px;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.lume-code--dark .lume-code-copy { color: #9ca3af; }
.lume-code--dark .lume-code-copy:hover { background: rgba(255,255,255,0.1); color: #fff; }
.lume-code--light .lume-code-copy { color: #6b7280; border-color: #d1d5da; }
.lume-code--light .lume-code-copy:hover { background: #e5e7eb; }

.lume-code-body {
  overflow: auto;
  padding: 12px 0;
}
.lume-code-table {
  border-collapse: collapse;
  width: 100%;
}
.lume-code-table pre {
  margin: 0;
  background: none;
  padding: 0;
  font: inherit;
  color: inherit;
  white-space: pre;
}
.lume-code-line-num {
  padding: 0 16px;
  text-align: right;
  user-select: none;
  opacity: 0.4;
  vertical-align: top;
  width: 1%;
  white-space: nowrap;
}
.lume-code-line {
  padding: 0 16px 0 8px;
}
</style>
