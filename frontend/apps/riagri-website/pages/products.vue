<template>
  <div>
    <!-- Hero Banner -->
    <section class="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      <div class="absolute inset-0 opacity-5">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs><pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="0.5" fill="white"/></pattern></defs>
          <rect width="100" height="100" fill="url(#dots)"/>
        </svg>
      </div>
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <nav class="flex items-center gap-2 text-sm text-primary-200 mb-6">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          <span class="text-white font-medium">Products</span>
        </nav>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Our Products</h1>
        <p class="mt-4 text-lg text-primary-100 max-w-2xl">Discover our comprehensive range of agricultural equipment and transport solutions built for performance and durability.</p>
      </div>
    </section>

    <!-- Filter Bar (Decorative) -->
    <section class="bg-white border-b border-gray-100 sticky top-16 lg:top-20 z-40">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center gap-3 overflow-x-auto pb-1">
          <button
            v-for="filter in filters"
            :key="filter"
            :class="[
              'px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200',
              activeFilter === filter
                ? 'bg-primary-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            ]"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>
    </section>

    <!-- Product Categories Grid -->
    <section class="py-16 lg:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <article v-for="category in categories" :key="category.title" class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200">
            <!-- Category Image Placeholder -->
            <div class="aspect-[16/10] bg-gradient-to-br relative overflow-hidden" :class="category.gradient">
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="w-24 h-24 text-white/40 group-hover:text-white/60 group-hover:scale-110 transition-all duration-500" v-html="category.icon" />
              </div>
              <div class="absolute top-4 right-4">
                <span class="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium text-white">{{ category.count }} Products</span>
              </div>
            </div>

            <div class="p-6">
              <h3 class="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">{{ category.title }}</h3>
              <p class="text-gray-500 text-sm leading-relaxed mb-5">{{ category.description }}</p>

              <!-- Feature Tags -->
              <div class="flex flex-wrap gap-2 mb-5">
                <span v-for="tag in category.tags" :key="tag" class="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">{{ tag }}</span>
              </div>

              <NuxtLink to="/contact" class="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                View Details
                <svg class="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </NuxtLink>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Product Highlights -->
    <section class="py-16 lg:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Best Sellers</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Top-Selling Equipment</h2>
          <p class="mt-4 text-lg text-gray-500">Our most popular products, trusted by hundreds of farming operations nationwide.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <article v-for="product in topProducts" :key="product.name" class="group bg-gray-50 rounded-2xl p-6 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-gray-200">
            <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-primary-100 transition-colors">
              <div class="w-8 h-8 text-primary-600" v-html="product.icon" />
            </div>
            <p class="text-xs font-medium text-primary-600 uppercase tracking-wider mb-1">{{ product.category }}</p>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ product.name }}</h3>
            <p class="text-sm text-gray-500 mb-4">{{ product.description }}</p>
            <p class="text-xl font-bold text-primary-700">{{ product.price }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 lg:py-20 bg-primary-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">Can't Find What You Need?</h2>
        <p class="text-lg text-gray-600 mb-8">Our team can source any agricultural equipment or parts you require. Get in touch for a custom quote.</p>
        <NuxtLink to="/contact" class="inline-flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          Request a Custom Quote
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePageContent } from '~/composables/useWebsiteData'

interface ProductCategory {
  title: string; description: string; count: string; gradient: string; tags: string[]; icon: string
}
interface TopProduct {
  name: string; category: string; description: string; price: string; icon: string
}
interface ProductsContent {
  filters: string[]
  categories: ProductCategory[]
  topProducts: TopProduct[]
}

const { content, seo } = usePageContent<ProductsContent>('products')

useHead({
  title: () => seo.value.title || 'Products - RIAGRI Agricultural Equipment',
  meta: [
    { name: 'description', content: () => seo.value.description || 'Browse RIAGRI\'s complete range of agricultural equipment including tractors, harvesters, irrigation systems, transport trailers, and genuine spare parts.' },
    { property: 'og:title', content: () => seo.value.ogTitle || 'Products - RIAGRI Agricultural Equipment' },
    { property: 'og:description', content: () => seo.value.ogDescription || 'Complete range of agricultural equipment, transport solutions, and spare parts.' },
  ],
})

const defaultFilters = ['All Products', 'Tractors', 'Harvesters', 'Irrigation', 'Transport', 'Parts']
const activeFilter = ref('All Products')

const filters = computed(() => content.value?.filters || defaultFilters)

const categories = computed(() => content.value?.categories || [
  {
    title: 'Tractors',
    description: 'From compact utility tractors to high-horsepower row-crop models, our tractor lineup delivers power, comfort, and efficiency for any farm size.',
    count: '24',
    gradient: 'from-primary-600 to-primary-800',
    tags: ['2WD & 4WD', '25-120 HP', 'Diesel'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><circle cx="28" cy="66" r="16"/><circle cx="68" cy="66" r="12"/><path d="M16 66H8V42l16-16h20l12 16h20v24h-8"/><path d="M44 26v28h32"/><circle cx="28" cy="66" r="6"/><circle cx="68" cy="66" r="5"/></svg>',
  },
  {
    title: 'Harvesters',
    description: 'State-of-the-art combine harvesters and specialized crop harvesting equipment designed for maximum yield with minimum crop loss.',
    count: '12',
    gradient: 'from-accent-500 to-accent-700',
    tags: ['Combine', 'Forage', 'Self-Propelled'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><rect x="20" y="24" width="48" height="36" rx="4"/><circle cx="26" cy="70" r="10"/><circle cx="62" cy="70" r="10"/><path d="M68 42h18v18H68"/><rect x="8" y="44" width="12" height="16" rx="3"/></svg>',
  },
  {
    title: 'Irrigation Systems',
    description: 'Water-efficient irrigation solutions from drip systems to center pivots, helping you optimize water usage while maximizing crop productivity.',
    count: '18',
    gradient: 'from-blue-500 to-blue-700',
    tags: ['Drip', 'Sprinkler', 'Solar-Powered'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><path d="M48 16c-10 16-20 26-20 38a20 20 0 0040 0c0-12-10-22-20-38z"/><path d="M38 50c0 5.5 4.5 10 10 10s10-4.5 10-10"/></svg>',
  },
  {
    title: 'Transport Trailers',
    description: 'Heavy-duty agricultural trailers built for reliable hauling. Flatbeds, tipping trailers, and specialized crop transport solutions.',
    count: '15',
    gradient: 'from-gray-600 to-gray-800',
    tags: ['Flatbed', 'Tipping', '5-20 Ton'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><rect x="12" y="30" width="56" height="28" rx="3"/><path d="M68 38h14l8 12v10H68"/><circle cx="26" cy="68" r="8"/><circle cx="56" cy="68" r="8"/><circle cx="82" cy="68" r="6"/></svg>',
  },
  {
    title: 'Spare Parts',
    description: 'Genuine OEM and high-quality aftermarket parts for all major equipment brands. Engines, filters, hydraulics, and electrical components.',
    count: '200+',
    gradient: 'from-red-500 to-red-700',
    tags: ['OEM', 'Filters', 'Hydraulics'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><path d="M56 24l-8 8-8-8-8 8v16l8 8 8-8 8 8 8-8V32l-8-8z"/><circle cx="48" cy="40" r="6"/><path d="M28 60h40v16H28z" rx="3"/></svg>',
  },
  {
    title: 'Accessories',
    description: 'Essential farming accessories including GPS guidance systems, lighting kits, safety equipment, and operator comfort upgrades.',
    count: '85',
    gradient: 'from-purple-500 to-purple-700',
    tags: ['GPS', 'Safety', 'Lighting'],
    icon: '<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="40" r="20"/><path d="M48 20v-8m20 28h8M48 60v8m-20-28h-8"/><path d="M62.14 25.86l5.66-5.66M62.14 54.14l5.66 5.66M33.86 54.14l-5.66 5.66M33.86 25.86l-5.66-5.66"/><circle cx="48" cy="40" r="8"/></svg>',
  },
])

const topProducts = computed(() => content.value?.topProducts || [
  {
    name: 'PowerTrac 5500',
    category: 'Tractor',
    description: '55 HP, 4WD with power steering and hydraulic PTO.',
    price: '$28,500',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V9l4-4h5l3 4h5v8h-3"/></svg>',
  },
  {
    name: 'AquaFlow Elite',
    category: 'Irrigation',
    description: 'Smart drip irrigation with solar-powered pump and app control.',
    price: '$4,800',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 3c-3 5-6 8-6 12a6 6 0 0012 0c0-4-3-7-6-12z"/></svg>',
  },
  {
    name: 'CargoHaul 12T',
    category: 'Trailer',
    description: '12 Ton hydraulic tipping trailer with reinforced chassis.',
    price: '$12,800',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="15" height="10" rx="1"/><path d="M16 10h4l3 3v3h-7V10z"/><circle cx="6" cy="18" r="2"/><circle cx="20" cy="18" r="2"/></svg>',
  },
  {
    name: 'GreenGuard GPS',
    category: 'Accessory',
    description: 'Precision GPS guidance system with auto-steer capability.',
    price: '$2,100',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>',
  },
])
</script>
