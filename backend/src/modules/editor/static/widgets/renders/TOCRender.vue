<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue';
import '../widget-styles.css';

interface TocEntry {
  id: string;
  text: string;
  level: number;
  children: TocEntry[];
}

const props = withDefaults(defineProps<{
  title?: string;
  maxDepth?: number;
  displayStyle?: string;
  sticky?: boolean;
  smoothScroll?: boolean;
  collapsible?: boolean;
}>(), {
  title: 'Table of Contents',
  maxDepth: 3,
  displayStyle: 'list',
  sticky: false,
  smoothScroll: true,
  collapsible: false,
});

const entries = ref<TocEntry[]>([]);
const isCollapsed = ref(false);

const listTag = computed(() => props.displayStyle === 'numbered' ? 'ol' : 'ul');

const wrapperClasses = computed(() => [
  'lume-toc',
  `lume-toc--${props.displayStyle}`,
  { 'lume-toc--sticky': props.sticky },
  { 'lume-toc--collapsed': isCollapsed.value },
]);

function generateId(text: string, index: number): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  return slug ? `${slug}-${index}` : `heading-${index}`;
}

function buildTree(flatEntries: { id: string; text: string; level: number }[]): TocEntry[] {
  const root: TocEntry[] = [];
  const stack: TocEntry[] = [];

  for (const entry of flatEntries) {
    const node: TocEntry = { id: entry.id, text: entry.text, level: entry.level, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= entry.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      root.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return root;
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: props.smoothScroll ? 'smooth' : 'auto', block: 'start' });
}

onMounted(async () => {
  await nextTick();

  const container = document.querySelector('.lume-page-content') || document.body;
  const selectors = Array.from({ length: props.maxDepth }, (_, i) => `h${i + 1}`).join(', ');
  const headings = container.querySelectorAll(selectors);

  const flatEntries: { id: string; text: string; level: number }[] = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.substring(1), 10);
    if (level > props.maxDepth) return;

    const text = heading.textContent?.trim() || '';
    if (!text) return;

    if (!heading.id) {
      heading.id = generateId(text, index);
    }

    flatEntries.push({ id: heading.id, text, level });
  });

  entries.value = buildTree(flatEntries);
});
</script>

<template>
  <nav :class="wrapperClasses" aria-label="Table of Contents">
    <div v-if="title || collapsible" class="lume-toc-header">
      <span v-if="title" class="lume-toc-title">{{ title }}</span>
      <button
        v-if="collapsible"
        class="lume-toc-toggle"
        :aria-expanded="!isCollapsed"
        @click="isCollapsed = !isCollapsed"
      >
        {{ isCollapsed ? '+' : '−' }}
      </button>
    </div>

    <div v-show="!isCollapsed" class="lume-toc-body">
      <template v-if="entries.length > 0">
        <component :is="listTag" class="lume-toc-list">
          <template v-for="entry in entries" :key="entry.id">
            <li class="lume-toc-item">
              <a
                :href="`#${entry.id}`"
                class="lume-toc-link"
                @click.prevent="scrollTo(entry.id)"
              >
                {{ entry.text }}
              </a>
              <component :is="listTag" v-if="entry.children.length" class="lume-toc-list lume-toc-list--nested">
                <template v-for="child in entry.children" :key="child.id">
                  <li class="lume-toc-item">
                    <a
                      :href="`#${child.id}`"
                      class="lume-toc-link"
                      @click.prevent="scrollTo(child.id)"
                    >
                      {{ child.text }}
                    </a>
                    <component :is="listTag" v-if="child.children.length" class="lume-toc-list lume-toc-list--nested">
                      <li v-for="sub in child.children" :key="sub.id" class="lume-toc-item">
                        <a
                          :href="`#${sub.id}`"
                          class="lume-toc-link"
                          @click.prevent="scrollTo(sub.id)"
                        >
                          {{ sub.text }}
                        </a>
                      </li>
                    </component>
                  </li>
                </template>
              </component>
            </li>
          </template>
        </component>
      </template>
      <p v-else class="lume-toc-empty">No headings found on this page.</p>
    </div>
  </nav>
</template>

<style scoped>
.lume-toc {
  border: 1px solid var(--lume-border, #e5e7eb);
  border-radius: var(--lume-radius-lg, 8px);
  padding: 16px 20px;
  background: var(--lume-bg, #fff);
  font-size: 0.9375rem;
  line-height: 1.6;
}
.lume-toc--sticky {
  position: sticky;
  top: 20px;
}
.lume-toc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--lume-border, #e5e7eb);
}
.lume-toc-title {
  font-weight: 600;
  font-size: 1rem;
  color: var(--lume-text, #1f2937);
}
.lume-toc-toggle {
  background: none;
  border: 1px solid var(--lume-border, #e5e7eb);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: var(--lume-text-muted, #6b7280);
  line-height: 1;
}
.lume-toc-toggle:hover {
  background: var(--lume-bg-hover, #f3f4f6);
}
.lume-toc-body { /* wrapper for v-show */ }
.lume-toc-list {
  margin: 0;
  padding-left: 0;
  list-style: none;
}
.lume-toc--numbered .lume-toc-list {
  list-style: decimal;
  padding-left: 20px;
}
.lume-toc--dots .lume-toc-list {
  list-style: disc;
  padding-left: 20px;
}
.lume-toc-list--nested {
  padding-left: 18px;
  margin-top: 2px;
}
.lume-toc-item {
  margin: 2px 0;
}
.lume-toc-link {
  color: var(--lume-primary, #1677ff);
  text-decoration: none;
  transition: color 0.15s;
}
.lume-toc-link:hover {
  color: var(--lume-primary-hover, #0958d9);
  text-decoration: underline;
}
.lume-toc-empty {
  color: var(--lume-text-muted, #9ca3af);
  font-style: italic;
  margin: 0;
}
</style>
