<template>
  <div>
    <!-- Hero Banner -->
    <section class="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      <div class="absolute -bottom-20 -left-20 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <nav class="flex items-center gap-2 text-sm text-primary-200 mb-6">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          <span class="text-white font-medium">About</span>
        </nav>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">About Us</h1>
        <p class="mt-4 text-lg text-primary-100 max-w-2xl">Dedicated to advancing agriculture through reliable equipment, innovative solutions, and unwavering commitment to our farming community.</p>
      </div>
    </section>

    <!-- Company Story -->
    <section class="py-16 lg:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <!-- Image Placeholder -->
          <div class="aspect-[4/3] bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl flex items-center justify-center relative overflow-hidden">
            <div class="absolute inset-0 opacity-20">
              <svg class="w-full h-full" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 250 Q100 200 200 220 Q300 240 400 200 V300 H0 Z" fill="#16a34a" opacity="0.3"/>
                <path d="M0 270 Q150 230 250 250 Q350 270 400 240 V300 H0 Z" fill="#16a34a" opacity="0.5"/>
                <circle cx="120" cy="100" r="40" fill="#16a34a" opacity="0.15"/>
                <circle cx="280" cy="80" r="30" fill="#f59e0b" opacity="0.15"/>
              </svg>
            </div>
            <div class="relative text-center p-8">
              <div class="w-20 h-20 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg class="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 3C9 3 6 6.5 6 12c0 3.5 1.5 6 3.5 7.5C10.5 20.2 11.2 20.5 12 21c.8-.5 1.5-.8 2.5-1.5C16.5 18 18 15.5 18 12c0-5.5-3-9-6-9z"/>
                  <path d="M12 5c-.8 1.5-1.5 4-1.5 7s.4 4.5 1.5 6c1.1-1.5 1.5-3 1.5-6s-.7-5.5-1.5-7z"/>
                </svg>
              </div>
              <p class="text-xl font-bold text-primary-800">Since 2009</p>
              <p class="text-sm text-primary-600 mt-1">Serving the Agricultural Community</p>
            </div>
          </div>

          <!-- Story Content -->
          <div>
            <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Our Story</p>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-6">Building the Future of Farming</h2>
            <div class="space-y-4 text-gray-600 leading-relaxed">
              <p v-for="(paragraph, i) in story" :key="i">{{ paragraph }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Mission, Vision, Values -->
    <section class="py-16 lg:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <article v-for="item in mvv" :key="item.title" class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" :class="item.bgColor">
              <div class="w-6 h-6" :class="item.iconColor" v-html="item.icon" />
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">{{ item.title }}</h3>
            <p class="text-gray-500 leading-relaxed">{{ item.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Team Section -->
    <section class="py-16 lg:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Our Team</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Meet the Leadership</h2>
          <p class="mt-4 text-lg text-gray-500">A dedicated team of agricultural experts and business professionals committed to your success.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <article v-for="member in teamMembers" :key="member.name" class="group text-center">
            <div class="w-32 h-32 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-md">
              <span class="text-3xl font-bold text-primary-700">{{ member.initials }}</span>
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-1">{{ member.name }}</h3>
            <p class="text-sm font-medium text-primary-600 mb-2">{{ member.role }}</p>
            <p class="text-sm text-gray-500 leading-relaxed">{{ member.bio }}</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="py-16 lg:py-20 bg-primary-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <p class="text-4xl sm:text-5xl font-extrabold text-white mb-2">{{ stat.value }}</p>
            <p class="text-sm text-primary-200">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 lg:py-20 bg-primary-50">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">Want to Learn More?</h2>
        <p class="text-lg text-gray-600 mb-8">We would love to hear from you. Visit our showroom or get in touch to discuss how we can support your farming operation.</p>
        <NuxtLink to="/contact" class="inline-flex items-center px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          Get in Touch
          <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePageContent } from '~/composables/useWebsiteData'

interface MvvItem {
  title: string; description: string; icon: string; bgColor: string; iconColor: string
}
interface TeamMember {
  name: string; role: string; initials: string; bio: string
}
interface StatItem {
  value: string; label: string
}
interface AboutContent {
  story: string[]
  mvv: MvvItem[]
  teamMembers: TeamMember[]
  stats: StatItem[]
}

const { content, seo } = usePageContent<AboutContent>('about')

useHead({
  title: () => seo.value.title || 'About Us',
  meta: [
    { name: 'description', content: () => seo.value.description || 'Learn more about our company and our mission.' },
    { property: 'og:title', content: () => seo.value.ogTitle || 'About Us' },
    { property: 'og:description', content: () => seo.value.ogDescription || 'Learn more about our company and mission.' },
  ],
})

const story = computed(() => content.value?.story || [
  'Our company was founded with a simple mission: to provide high-quality products and services to our customers.',
  'Over the years, we have grown into a trusted partner for our community. Our success is driven by a commitment to understanding the needs of our customers.',
  'Today, we offer a comprehensive range of products and services. We are not just a service provider; we are a partner in your success.',
])

const mvv = computed(() => content.value?.mvv || [
  {
    title: 'Our Mission',
    description: 'To empower farmers and agricultural businesses with access to reliable, high-performance equipment and exceptional service that drives productivity, profitability, and sustainable growth.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    bgColor: 'bg-primary-50',
    iconColor: 'text-primary-600',
  },
  {
    title: 'Our Vision',
    description: 'To be the most trusted and innovative agricultural equipment partner in the region, setting the standard for product quality, customer service, and farming technology adoption.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>',
    bgColor: 'bg-accent-50',
    iconColor: 'text-accent-600',
  },
  {
    title: 'Our Values',
    description: 'Integrity in every transaction. Quality in every product. Excellence in every service. Community in every relationship. Innovation in every solution we deliver.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>',
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
  },
])

const teamMembers = computed(() => content.value?.teamMembers || [
  { name: 'David Kariuki', role: 'Founder & CEO', initials: 'DK', bio: '20+ years in agricultural engineering with a passion for modernizing farming across Africa.' },
  { name: 'Grace Wanjiru', role: 'Head of Operations', initials: 'GW', bio: 'Supply chain expert ensuring seamless equipment delivery and inventory management nationwide.' },
  { name: 'Michael Omondi', role: 'Chief Technical Officer', initials: 'MO', bio: 'Certified agricultural mechanic leading our service team with 15 years of hands-on experience.' },
  { name: 'Amina Hassan', role: 'Sales Director', initials: 'AH', bio: 'Agricultural economics graduate driving strategic growth and building lasting client relationships.' },
])

const stats = computed(() => content.value?.stats || [
  { value: '15+', label: 'Years in Business' },
  { value: '500+', label: 'Happy Clients' },
  { value: '3,000+', label: 'Machines Serviced' },
  { value: '8', label: 'Service Centers' },
])
</script>
