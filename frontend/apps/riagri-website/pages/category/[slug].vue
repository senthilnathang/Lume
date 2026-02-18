<template>
  <div>
    <!-- Loading -->
    <div v-if="pending" class="max-w-4xl mx-auto px-4 py-20">
      <div class="animate-pulse space-y-4">
        <div class="h-8 bg-gray-200 rounded w-1/3"></div>
        <div class="h-4 bg-gray-200 rounded w-2/3"></div>
        <div class="grid grid-cols-2 gap-4 mt-8">
          <div v-for="i in 4" :key="i" class="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>

    <!-- 404 -->
    <div v-else-if="error || !category" class="max-w-4xl mx-auto px-4 py-20 text-center">
      <h1 class="text-4xl font-bold text-gray-300 mb-4">Not Found</h1>
      <p class="text-gray-500 mb-6">Category not found.</p>
      <NuxtLink to="/" class="text-primary-600 hover:underline">Back to Home</NuxtLink>
    </div>

    <!-- Category Archive -->
    <div v-else>
      <!-- Header -->
      <div class="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="max-w-3xl">
            <nav class="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <NuxtLink to="/" class="hover:text-primary-600">Home</NuxtLink>
              <span>/</span>
              <span class="text-gray-700">Categories</span>
              <span>/</span>
              <span class="text-gray-700">{{ category.name }}</span>
            </nav>
            <h1 class="text-3xl font-bold text-gray-900">{{ category.name }}</h1>
            <p v-if="category.description" class="mt-2 text-gray-600">{{ category.description }}</p>
            <p class="mt-1 text-sm text-gray-400">{{ pages.length }} page{{ pages.length !== 1 ? 's' : '' }}</p>
          </div>
        </div>
      </div>

      <!-- Pages Grid -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div v-if="pages.length === 0" class="text-center py-12 text-gray-400">
          No pages in this category yet.
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <NuxtLink
            v-for="p in pages"
            :key="p.id"
            :to="`/${p.slug}`"
            class="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
          >
            <img
              v-if="p.featuredImage"
              :src="p.featuredImage"
              :alt="p.title"
              class="w-full h-40 object-cover"
            />
            <div class="p-4">
              <h2 class="font-semibold text-gray-900 mb-1">{{ p.title }}</h2>
              <p v-if="p.excerpt" class="text-sm text-gray-500 line-clamp-2">{{ p.excerpt }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const slug = route.params.slug as string;

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const { data: catData, pending, error } = await useFetch<any>(`${apiBase}/categories/${slug}`);
const category = computed(() => catData.value?.data || null);

const { data: pagesData } = await useFetch<any>(`${apiBase}/categories/${slug}/pages`);
const pages = computed(() => pagesData.value?.data || []);

useHead({
  title: () => category.value ? `${category.value.name} — Category Archive` : 'Category Archive',
});
useSeoMeta({
  description: () => category.value?.description || `Browse all pages in the ${category.value?.name || ''} category.`,
});
</script>
