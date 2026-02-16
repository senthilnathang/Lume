<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.3"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)"/>
        </svg>
      </div>
      <!-- Decorative circles -->
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-primary-100 text-sm font-medium mb-8">
            <span class="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
            Trusted by 500+ farming businesses
          </div>
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Powering Modern
            <span class="block text-accent-400">Agriculture</span>
          </h1>
          <p class="mt-6 text-lg sm:text-xl text-primary-100 leading-relaxed max-w-2xl">
            Premium agricultural equipment, reliable transport devices, and expert service solutions to help your farm thrive in every season.
          </p>
          <div class="mt-10 flex flex-col sm:flex-row gap-4">
            <NuxtLink to="/products" class="inline-flex items-center justify-center px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-base">
              Browse Products
              <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </NuxtLink>
            <NuxtLink to="/services" class="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/20 transition-all duration-300 text-base">
              Our Services
            </NuxtLink>
          </div>
        </div>

        <!-- Hero Stats -->
        <div class="mt-16 grid grid-cols-3 gap-6 max-w-lg">
          <div v-for="stat in heroStats" :key="stat.label" class="text-center sm:text-left">
            <p class="text-3xl sm:text-4xl font-extrabold text-white">{{ stat.value }}</p>
            <p class="text-sm text-primary-200 mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Products Overview -->
    <section class="py-20 lg:py-28 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">What We Offer</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Complete Agricultural Solutions</h2>
          <p class="mt-4 text-lg text-gray-500">From heavy machinery to spare parts, we provide everything your farm needs to operate at peak efficiency.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div v-for="category in productCategories" :key="category.title" class="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200">
            <div class="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-100 transition-colors">
              <div class="w-7 h-7 text-primary-600" v-html="category.icon" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ category.title }}</h3>
            <p class="text-gray-500 leading-relaxed mb-6">{{ category.description }}</p>
            <NuxtLink to="/products" class="inline-flex items-center text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors group-hover:gap-2 gap-1">
              Explore
              <svg class="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Why Choose Us -->
    <section class="py-20 lg:py-28 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Why RIAGRI</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Built for Farmers, by Experts</h2>
          <p class="mt-4 text-lg text-gray-500">We combine deep agricultural knowledge with modern technology to deliver solutions you can depend on.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="feature in features" :key="feature.title" class="text-center group">
            <div class="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-300">
              <div class="w-8 h-8 text-primary-600" v-html="feature.icon" />
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Featured Products -->
    <section class="py-20 lg:py-28 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-end justify-between mb-12">
          <div>
            <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Featured</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Popular Equipment</h2>
          </div>
          <NuxtLink to="/products" class="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors">
            View All
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <article v-for="product in featuredProducts" :key="product.name" class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div class="aspect-[4/3] bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-6">
              <div class="w-20 h-20 text-primary-300 group-hover:text-primary-400 transition-colors" v-html="product.icon" />
            </div>
            <div class="p-5">
              <p class="text-xs font-medium text-primary-600 uppercase tracking-wider mb-1">{{ product.category }}</p>
              <h3 class="text-base font-bold text-gray-900 mb-2">{{ product.name }}</h3>
              <p class="text-sm text-gray-500 mb-4">{{ product.specs }}</p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-primary-700">{{ product.price }}</span>
                <NuxtLink to="/contact" class="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">Inquire</NuxtLink>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Testimonials -->
    <section class="py-20 lg:py-28 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Testimonials</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">What Our Clients Say</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article v-for="testimonial in testimonials" :key="testimonial.name" class="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <div class="flex items-center gap-1 mb-4">
              <svg v-for="n in 5" :key="n" class="w-5 h-5 text-accent-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            </div>
            <blockquote class="text-gray-600 leading-relaxed mb-6">"{{ testimonial.quote }}"</blockquote>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <span class="text-sm font-bold text-primary-700">{{ testimonial.initials }}</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{{ testimonial.name }}</p>
                <p class="text-xs text-gray-500">{{ testimonial.location }}</p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- CTA Banner -->
    <section class="py-20 lg:py-24 bg-gradient-to-r from-primary-700 to-primary-900 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <circle cx="80" cy="20" r="30" fill="white"/>
          <circle cx="10" cy="80" r="20" fill="white"/>
        </svg>
      </div>
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">Ready to Upgrade Your Farm?</h2>
        <p class="text-lg text-primary-100 mb-10 max-w-2xl mx-auto">Get in touch with our team for personalized equipment recommendations, competitive pricing, and expert consultation.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/contact" class="inline-flex items-center justify-center px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
            Contact Us Today
          </NuxtLink>
          <a href="tel:+1234567890" class="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all duration-300">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Call Us Now
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
interface HomeContent {
  heroStats: { value: string; label: string }[]
  productCategories: { title: string; description: string; icon: string }[]
  features: { title: string; description: string; icon: string }[]
  featuredProducts: { name: string; category: string; specs: string; price: string; icon: string }[]
  testimonials: { quote: string; name: string; location: string; initials: string }[]
}

const { content, seo } = usePageContent<HomeContent>('home')

useHead({
  title: seo.value.title || 'RIAGRI - Agricultural Equipment & Transport Solutions',
  meta: [
    { name: 'description', content: seo.value.description || 'RIAGRI provides premium agricultural equipment, transport devices, and expert service solutions for modern farming. 15+ years of trusted service.' },
    { property: 'og:title', content: seo.value.ogTitle || 'RIAGRI - Agricultural Equipment & Transport Solutions' },
    { property: 'og:description', content: seo.value.ogDescription || 'Premium agricultural equipment, transport devices, and expert service solutions for modern farming.' },
    { property: 'og:type', content: 'website' },
  ],
})

// Fallback defaults
const defaultHeroStats = [
  { value: '15+', label: 'Years Experience' },
  { value: '500+', label: 'Happy Clients' },
  { value: '1000+', label: 'Machines Sold' },
]

const defaultProductCategories = [
  { title: 'Tractors & Machinery', description: 'High-performance tractors and farming machinery from leading manufacturers, built to handle any terrain and task.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="2"/><path d="M5 17H3V9l4-4h5l3 4h5v8h-3"/><path d="M10 5v6h7"/></svg>' },
  { title: 'Transport Equipment', description: 'Reliable trailers, carriers, and transport solutions designed for agricultural logistics and heavy-duty hauling.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="6" width="15" height="10" rx="1"/><path d="M16 10h4l3 3v3h-7V10z"/><circle cx="6" cy="18" r="2"/><circle cx="20" cy="18" r="2"/></svg>' },
  { title: 'Spare Parts & Accessories', description: 'Genuine spare parts and premium accessories to keep your equipment running at peak performance year-round.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>' },
]

const defaultFeatures = [
  { title: 'Expert Service', description: 'Our certified technicians bring decades of combined experience to every job.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>' },
  { title: 'Genuine Parts', description: 'Only authentic manufacturer parts ensuring longevity and optimal performance.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>' },
  { title: 'Nationwide Delivery', description: 'Fast and secure delivery to your doorstep, no matter where your farm is located.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>' },
  { title: '24/7 Support', description: 'Round-the-clock customer support to keep your operations running smoothly.', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>' },
]

const defaultFeaturedProducts = [
  { name: 'PowerTrac 5500', category: 'Tractor', specs: '55 HP, 4WD, Power Steering', price: '$28,500', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="22" cy="55" r="14"/><circle cx="58" cy="55" r="10"/><path d="M12 55H6V35l14-14h18l10 14h18v20h-8"/><path d="M36 21v20h28"/><circle cx="22" cy="55" r="5"/><circle cx="58" cy="55" r="4"/></svg>' },
  { name: 'HarvestMax 3000', category: 'Harvester', specs: '300 HP, 6m Header Width', price: '$145,000', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="15" y="20" width="40" height="30" rx="4"/><circle cx="20" cy="58" r="8"/><circle cx="50" cy="58" r="8"/><path d="M55 35h15v15H55"/><rect x="5" y="38" width="10" height="12" rx="2"/></svg>' },
  { name: 'AquaFlow Pro', category: 'Irrigation', specs: '50m Range, Solar Powered', price: '$3,200', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M40 15c-8 12-16 20-16 30a16 16 0 0032 0c0-10-8-18-16-30z"/><path d="M32 42c0 4.4 3.6 8 8 8s8-3.6 8-8"/></svg>' },
  { name: 'CargoHaul 12T', category: 'Trailer', specs: '12 Ton Capacity, Hydraulic Tip', price: '$12,800', icon: '<svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="10" y="25" width="50" height="25" rx="2"/><path d="M60 30h10l6 10v10H60"/><circle cx="22" cy="58" r="7"/><circle cx="48" cy="58" r="7"/><circle cx="70" cy="58" r="5"/><line x1="5" y1="50" x2="10" y2="50"/></svg>' },
]

const defaultTestimonials = [
  { quote: "RIAGRI transformed our farming operation. Their PowerTrac series is incredibly reliable and their service team is always just a call away. Best investment we've made.", name: 'James Mwangi', location: 'Nakuru County', initials: 'JM' },
  { quote: "We've been sourcing all our spare parts from RIAGRI for 5 years. Genuine parts, fair prices, and delivery is always on time. They truly understand farmers' needs.", name: 'Sarah Odhiambo', location: 'Kisumu Region', initials: 'SO' },
  { quote: 'The transport equipment we bought has been a game changer for our logistics. The CargoHaul trailers are built to last and handle our rough terrain perfectly.', name: 'Peter Kamau', location: 'Eldoret Valley', initials: 'PK' },
]

const heroStats = computed(() => content.value?.heroStats || defaultHeroStats)
const productCategories = computed(() => content.value?.productCategories || defaultProductCategories)
const features = computed(() => content.value?.features || defaultFeatures)
const featuredProducts = computed(() => content.value?.featuredProducts || defaultFeaturedProducts)
const testimonials = computed(() => content.value?.testimonials || defaultTestimonials)
</script>
