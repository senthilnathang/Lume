<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="max-w-4xl mx-auto px-4 py-20">
      <div class="animate-pulse space-y-6">
        <div class="h-10 bg-gray-200 rounded w-2/3"></div>
        <div class="h-4 bg-gray-200 rounded w-full"></div>
        <div class="h-4 bg-gray-200 rounded w-5/6"></div>
        <div class="h-4 bg-gray-200 rounded w-4/6"></div>
        <div class="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>

    <!-- 404 -->
    <div v-else-if="error || !page" class="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 class="text-6xl font-bold text-gray-200 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
      <p class="text-gray-500 mb-8">The page you're looking for doesn't exist or has been moved.</p>
      <NuxtLink
        to="/"
        class="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors"
      >
        Back to Home
      </NuxtLink>
    </div>

    <!-- Password Gate -->
    <div v-else-if="requiresPassword && !passwordToken" class="max-w-md mx-auto px-4 py-20 text-center">
      <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="text-2xl font-bold text-gray-900 mb-2">{{ page?.title || 'Protected Page' }}</h2>
      <p class="text-gray-500 mb-8">This page is password protected. Please enter the password to continue.</p>
      <form @submit.prevent="submitPassword" class="space-y-4">
        <input
          v-model="passwordInput"
          type="password"
          placeholder="Enter password"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          :disabled="passwordLoading"
          autofocus
        />
        <p v-if="passwordError" class="text-red-600 text-sm">{{ passwordError }}</p>
        <button
          type="submit"
          :disabled="passwordLoading || !passwordInput.trim()"
          class="w-full py-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {{ passwordLoading ? 'Verifying...' : 'Unlock Page' }}
        </button>
      </form>
    </div>

    <!-- Page Content -->
    <div v-else ref="pageRef" :class="{ 'pt-12': editActive || isThemePreview }" :style="editActive ? 'transition: padding-top 0.3s ease' : ''">
      <!-- Theme Preview Banner -->
      <div v-if="isThemePreview" class="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2 bg-indigo-700 text-white text-sm shadow-lg">
        <span>
          <strong>Preview Mode</strong> — Previewing
          <span class="capitalize mx-1">{{ previewTemplateType }}</span>
          template (not saved)
        </span>
        <button
          class="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
          @click="$router.back()"
        >✕ Close Preview</button>
      </div>
      <!-- Page Header (skip for landing pages) -->
      <div v-if="page.pageType !== 'landing'" class="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="max-w-3xl">
            <!-- Breadcrumb strip -->
            <nav class="flex items-center flex-wrap gap-1.5 text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
              <NuxtLink to="/" class="hover:text-primary-600 transition-colors">Home</NuxtLink>
              <template v-for="(crumb, i) in breadcrumbs" :key="crumb.slug">
                <span class="text-gray-300">/</span>
                <NuxtLink
                  v-if="i < breadcrumbs.length - 1"
                  :to="`/${crumb.slug}`"
                  class="hover:text-primary-600 transition-colors"
                >{{ crumb.title }}</NuxtLink>
                <span v-else class="text-gray-700 font-medium">{{ crumb.title }}</span>
              </template>
            </nav>
            <h1 class="text-3xl sm:text-4xl font-bold text-gray-900">{{ page.title }}</h1>
            <p v-if="page.excerpt" class="mt-3 text-lg text-gray-600">{{ page.excerpt }}</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div :class="contentWrapperClass" :style="editActive && settingsPanelOpen ? 'margin-right: 340px; transition: margin-right 0.3s ease' : ''">
        <PageRenderer
          :page="page"
          :editMode="editActive"
          :editContent="editActive ? currentContent : undefined"
          @update:content="handleContentUpdate"
          @select-block="handleBlockSelect"
          @insert-block="handleInsertBlock"
        />
      </div>
    </div>

    <!-- Edit mode components -->
    <ClientOnly>
      <BuilderEditModeToggle v-if="isTipTapPage" @enter-edit="handleEnterEdit" />
      <BuilderOverlay />
      <BuilderWidgetSettingsPanel
        :key="editVersion"
        :visible="settingsPanelOpen"
        :block="selectedBlock"
        :blockType="selectedBlockType"
        @close="clearSelection"
        @update:attr="handleAttrUpdate"
      />
      <BuilderBlockPickerModal
        :visible="pickerVisible"
        @close="closePicker"
        @pick="handlePickWidget"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, onMounted, nextTick } from 'vue';
import { useRuntimeConfig } from '#app';
import { widgetRegistry } from '@widgets/registry';

const route = useRoute();
const slug = computed(() => {
  const params = route.params.slug;
  if (Array.isArray(params)) return params.join('/');
  return params || '';
});

// Theme preview mode — detect ?preview_template + ?preview_id from theme-builder admin
const isThemePreview = computed(() =>
  !!(route.query.preview_template && route.query.preview_id),
);
const previewTemplateType = computed(() => route.query.preview_template as string || '');

const { page: fetchedPage, seo, pending, error } = usePageContent(slug.value);
const { isAdmin } = useAuth();

// Password gate — declared early so `page` computed can reference it
const unlockedPage = ref<any>(null);

// displayPage: prefer unlocked (password-verified) page over initial fetch result
const page = computed(() => unlockedPage.value || fetchedPage.value);
const {
  active: editActive,
  currentContent,
  selectedBlockPath,
  version: editVersion,
  enterEditMode,
  updateContent,
  updateBlockAttrs,
  selectBlock,
  clearSelection,
  getBlockAtPath,
} = useEditMode();

const config = useRuntimeConfig();

// Schema.org JSON-LD
const jsonLdSchemas = computed(() => {
  if (!page.value) return [];
  const siteUrl = config.public.siteUrl || 'http://localhost:3100';
  const siteName = config.public.siteName || 'Lume';
  const pageUrl = `${siteUrl}/${page.value.slug || ''}`;
  const schemas: any[] = [];

  // WebPage or Article schema
  const isArticle = page.value.pageType === 'post' || page.value.pageType === 'blog';
  schemas.push({
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : 'WebPage',
    name: page.value.metaTitle || page.value.title,
    description: page.value.metaDescription || '',
    url: pageUrl,
    ...(page.value.featuredImage ? { image: page.value.featuredImage } : {}),
    ...(page.value.publishedAt ? { datePublished: page.value.publishedAt } : {}),
    ...(page.value.updatedAt ? { dateModified: page.value.updatedAt } : {}),
    publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
  });

  // Organization schema on homepage
  if (!page.value.slug || page.value.slug === 'home') {
    schemas.push({ '@context': 'https://schema.org', '@type': 'Organization', name: siteName, url: siteUrl });
  }

  // FAQPage schema if content has faqBlock nodes
  if (page.value.content) {
    try {
      const parsed = typeof page.value.content === 'string'
        ? JSON.parse(page.value.content)
        : page.value.content;
      const faqItems: { question: string; answer: string }[] = [];
      function walkFaq(nodes: any[]) {
        if (!Array.isArray(nodes)) return;
        for (const node of nodes) {
          if (node.type === 'faqBlock' && Array.isArray(node.attrs?.items)) {
            for (const item of node.attrs.items) {
              if (item.question && item.answer) faqItems.push(item);
            }
          }
          if (node.content) walkFaq(node.content);
        }
      }
      walkFaq(parsed.content || []);
      if (faqItems.length > 0) {
        schemas.push({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqItems.map(item => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: { '@type': 'Answer', text: item.answer },
          })),
        });
      }
    } catch { /* ignore */ }
  }

  // BreadcrumbList schema — always injected (at least Home → Page)
  const isHomepage = !page.value.slug || page.value.slug === 'home' || page.value.slug === '/';
  if (!isHomepage) {
    const breadcrumbItems: any[] = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    ];
    // If the page has a parentId we'd need the parent's title/slug — we use a best-effort
    // approach here: the slug path segments serve as breadcrumb steps
    const slugParts = (page.value.slug || '').split('/').filter(Boolean);
    if (slugParts.length > 1) {
      for (let i = 0; i < slugParts.length - 1; i++) {
        const partSlug = slugParts.slice(0, i + 1).join('/');
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: i + 2,
          name: slugParts[i].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
          item: `${siteUrl}/${partSlug}`,
        });
      }
    }
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: breadcrumbItems.length + 1,
      name: page.value.metaTitle || page.value.title,
      item: pageUrl,
    });
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbItems,
    });
  }

  return schemas;
});

// SEO meta tags
useHead(() => ({
  title: seo.value.title || undefined,
  script: jsonLdSchemas.value.map(schema => ({
    type: 'application/ld+json',
    children: JSON.stringify(schema),
  })),
}));
useSeoMeta({
  title: () => seo.value.title,
  description: () => seo.value.description,
  ogTitle: () => seo.value.ogTitle,
  ogDescription: () => seo.value.ogDescription,
  ogImage: () => seo.value.ogImage || undefined,
});

// Content wrapper class based on page template
const contentWrapperClass = computed(() => {
  const template = page.value?.template || 'default';
  switch (template) {
    case 'full-width': return 'w-full';
    case 'blank': return '';
    case 'sidebar': return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
    default: return 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12';
  }
});

// Detect if this page uses TipTap JSON content (editable)
const isTipTapPage = computed(() => {
  if (!page.value?.content) return false;
  try {
    const parsed = typeof page.value.content === 'string'
      ? JSON.parse(page.value.content)
      : page.value.content;
    return parsed && (parsed.type === 'doc' || Array.isArray(parsed));
  } catch {
    return false;
  }
});

// Selected block state
const selectedBlock = computed(() => {
  if (!editActive.value || !selectedBlockPath.value.length) return null;
  return getBlockAtPath(selectedBlockPath.value);
});

const selectedBlockType = computed(() => selectedBlock.value?.type || '');
const settingsPanelOpen = computed(() => editActive.value && selectedBlockPath.value.length > 0);

// Handlers
function handleEnterEdit() {
  if (!page.value) return;
  const content = typeof page.value.content === 'string'
    ? JSON.parse(page.value.content)
    : page.value.content;
  enterEditMode(page.value.id, content);
}

function handleContentUpdate(newContent: any) {
  updateContent(newContent);
}

function handleBlockSelect(path: number[]) {
  selectBlock(path);
}

function handleAttrUpdate(key: string, value: any) {
  if (selectedBlockPath.value.length) {
    updateBlockAttrs(selectedBlockPath.value, key, value);
  }
}

// ─── Block picker (insert block) ────────────────────────────────────────────
const pickerVisible = ref(false);
const pendingInsert = ref<{ path: number[]; position: string } | null>(null);

function handleInsertBlock(path: number[], position: string) {
  pendingInsert.value = { path, position };
  pickerVisible.value = true;
}

function closePicker() {
  pickerVisible.value = false;
  pendingInsert.value = null;
}

function handlePickWidget(type: string) {
  if (!pendingInsert.value || !currentContent.value) {
    closePicker();
    return;
  }

  const { path, position } = pendingInsert.value;
  const def = widgetRegistry.find(w => w.type === type);
  if (!def) { closePicker(); return; }

  // Build new node with all defaults
  const newNode: any = { type, attrs: { ...def.defaults } };

  // Compute insertion index
  // position='before' → insert at path[0]
  // position='after'  → insert at path[0] + 1
  const idx = position === 'before' ? path[0] : path[0] + 1;

  // Deep clone current content and splice in the new node
  const newContent = JSON.parse(JSON.stringify(currentContent.value));
  const contentArr = newContent.content ?? newContent;
  if (Array.isArray(contentArr)) {
    contentArr.splice(idx, 0, newNode);
  }

  updateContent(newContent);
  closePicker();
}

// Password gate (continued — unlockedPage declared earlier)
const requiresPassword = computed(() => page.value?.requiresPassword === true && !unlockedPage.value);
const passwordInput = ref('');
const passwordError = ref('');
const passwordLoading = ref(false);

// On client mount, try stored token
onMounted(async () => {
  if (typeof window === 'undefined') return;
  const storedToken = sessionStorage.getItem(`page_token_${slug.value}`);
  if (storedToken && page.value?.requiresPassword) {
    await fetchWithToken(storedToken);
  }
});

async function fetchWithToken(token: string) {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase as string;
  try {
    const res = await $fetch<{ success: boolean; data: any }>(`${baseURL}/pages/${slug.value}`, {
      headers: { 'x-page-password': token },
    });
    if (res?.data && !res.data.requiresPassword) {
      unlockedPage.value = res.data;
    }
  } catch { /* token invalid */ }
}

async function submitPassword() {
  if (!passwordInput.value.trim()) return;
  passwordLoading.value = true;
  passwordError.value = '';
  try {
    const config = useRuntimeConfig();
    const baseURL = config.public.apiBase as string;
    const res = await $fetch<{ success: boolean; data: { token: string } }>(
      `${baseURL}/pages/${slug.value}/verify-password`,
      { method: 'POST', body: { password: passwordInput.value } }
    );
    if (res?.data?.token) {
      sessionStorage.setItem(`page_token_${slug.value}`, res.data.token);
      await fetchWithToken(res.data.token);
    }
  } catch {
    passwordError.value = 'Incorrect password. Please try again.';
  } finally {
    passwordLoading.value = false;
  }
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────
const breadcrumbs = ref<{ title: string; slug: string }[]>([]);

async function loadBreadcrumbs() {
  if (!page.value) return;

  // If the page has a parentId, fetch the full chain from the API
  if (page.value.parentId) {
    try {
      const config2 = useRuntimeConfig();
      const baseURL = config2.public.apiBase as string;
      const res = await $fetch<{ success: boolean; data: { title: string; slug: string }[] }>(
        `${baseURL}/pages/${slug.value}/breadcrumbs`,
      );
      if (res?.data?.length) {
        breadcrumbs.value = res.data;
        return;
      }
    } catch { /* fall through to slug-segment fallback */ }
  }

  // Fallback: derive breadcrumbs from slug path segments
  const parts = (page.value.slug || '').split('/').filter(Boolean);
  breadcrumbs.value = parts.map((part, i) => ({
    slug: parts.slice(0, i + 1).join('/'),
    title: part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  }));
  // Replace the last entry title with the actual page title
  if (breadcrumbs.value.length > 0) {
    breadcrumbs.value[breadcrumbs.value.length - 1].title = page.value.title;
  }
}

// Load breadcrumbs when page data is ready
watch(() => page.value?.id, () => { loadBreadcrumbs(); }, { immediate: true });

// Motion FX & interactions — wire up after page content renders
const pageRef = ref<HTMLElement | null>(null);
const motionFx = useMotionFx();
const interactions = useInteractions();
const sticky = useSticky();

function initPageEffects() {
  nextTick(() => {
    motionFx.init();
    interactions.init();
    sticky.init();
  });
}

function destroyPageEffects() {
  motionFx.destroy();
  interactions.destroy();
  sticky.destroy();
}

onMounted(() => {
  initPageEffects();
});

// Re-init effects when page content changes (route navigation)
watch(() => page.value?.id, () => {
  destroyPageEffects();
  initPageEffects();
});
</script>
