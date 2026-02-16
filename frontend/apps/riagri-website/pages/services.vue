<template>
  <div>
    <!-- Hero Banner -->
    <section class="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      <div class="absolute -top-20 -right-20 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <nav class="flex items-center gap-2 text-sm text-primary-200 mb-6">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          <span class="text-white font-medium">Services</span>
        </nav>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Our Services</h1>
        <p class="mt-4 text-lg text-primary-100 max-w-2xl">End-to-end agricultural support from equipment selection and purchase to maintenance, repair, and ongoing technical training.</p>
      </div>
    </section>

    <!-- Services Grid -->
    <section class="py-16 lg:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <article v-for="service in services" :key="service.title" class="group bg-white rounded-2xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-primary-200">
            <div class="flex items-start gap-5">
              <div class="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                <div class="w-7 h-7 text-primary-600" v-html="service.icon" />
              </div>
              <div class="flex-1">
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">{{ service.title }}</h3>
                <p class="text-gray-500 leading-relaxed mb-5">{{ service.description }}</p>
                <ul class="space-y-2.5">
                  <li v-for="feature in service.features" :key="feature" class="flex items-center gap-2.5 text-sm text-gray-600">
                    <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    {{ feature }}
                  </li>
                </ul>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Service Process -->
    <section class="py-16 lg:py-24 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-16">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">How It Works</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Our Service Process</h2>
          <p class="mt-4 text-lg text-gray-500">A simple, streamlined process from your first inquiry to ongoing after-sales support.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div v-for="(step, index) in processSteps" :key="step.title" class="relative text-center group">
            <!-- Connector line -->
            <div v-if="index < processSteps.length - 1" class="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-primary-100" />

            <div class="relative z-10 w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white font-bold text-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
              {{ index + 1 }}
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ step.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Service Guarantees -->
    <section class="py-16 lg:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto mb-14">
          <p class="text-sm font-semibold text-primary-600 uppercase tracking-wider mb-3">Our Promise</p>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">Service Guarantees</h2>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="guarantee in guarantees" :key="guarantee.title" class="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
            <div class="w-14 h-14 bg-accent-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <div class="w-7 h-7 text-accent-600" v-html="guarantee.icon" />
            </div>
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ guarantee.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ guarantee.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 lg:py-20 bg-gradient-to-r from-primary-700 to-primary-900 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <svg class="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none"><circle cx="85" cy="10" r="25" fill="white"/></svg>
      </div>
      <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">Schedule a Service</h2>
        <p class="text-lg text-primary-100 mb-10 max-w-2xl mx-auto">Whether you need routine maintenance, emergency repairs, or a complete equipment overhaul, our team is ready to help.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink to="/contact" class="inline-flex items-center justify-center px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
            Book a Service
          </NuxtLink>
          <a href="tel:+1234567890" class="inline-flex items-center justify-center px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl border border-white/20 backdrop-blur-sm transition-all duration-300">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            Emergency Line
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'Services - RIAGRI Agricultural Solutions',
  meta: [
    { name: 'description', content: 'RIAGRI offers equipment sales consultation, maintenance and repair, spare parts supply, and technical training for agricultural businesses.' },
    { property: 'og:title', content: 'Services - RIAGRI Agricultural Solutions' },
    { property: 'og:description', content: 'Complete agricultural equipment services: sales, maintenance, repairs, parts supply, and training.' },
  ],
})

const services = [
  {
    title: 'Equipment Sales & Consultation',
    description: 'Our experienced sales team helps you choose the right equipment for your specific farming needs, terrain, and budget. We provide detailed comparisons, demo sessions, and financing guidance.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>',
    features: [
      'Personalized equipment recommendations',
      'On-site demonstrations and test drives',
      'Flexible financing and leasing options',
      'Trade-in and upgrade programs',
    ],
  },
  {
    title: 'Maintenance & Repair',
    description: 'Keep your equipment running at peak performance with our comprehensive maintenance programs. From routine servicing to complex repairs, our certified technicians handle it all.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>',
    features: [
      'Scheduled preventive maintenance plans',
      'Emergency breakdown repair service',
      'Engine and transmission overhauls',
      'Hydraulic system diagnostics and repair',
    ],
  },
  {
    title: 'Spare Parts Supply',
    description: 'Access to a vast inventory of genuine OEM parts and high-quality aftermarket alternatives. Fast sourcing and delivery for any make and model of agricultural equipment.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>',
    features: [
      'Genuine OEM parts for all major brands',
      'Quality aftermarket alternatives',
      'Express delivery for urgent orders',
      'Parts warranty and return policy',
    ],
  },
  {
    title: 'Training & Support',
    description: 'Maximize your equipment investment with operator training programs, safety workshops, and ongoing technical support from our expert agricultural engineers.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/><path d="M12 14l9-5-9-5-9 5 9 5zm0 0v7"/></svg>',
    features: [
      'Operator certification programs',
      'Safety and compliance training',
      'Equipment optimization workshops',
      '24/7 phone and on-site technical support',
    ],
  },
]

const processSteps = [
  {
    title: 'Consultation',
    description: 'Tell us about your farming operation, challenges, and goals. We listen and assess your needs thoroughly.',
  },
  {
    title: 'Selection',
    description: 'We recommend the best equipment and service packages tailored to your specific requirements and budget.',
  },
  {
    title: 'Delivery',
    description: 'Professional delivery, installation, and setup with hands-on operator training at your farm.',
  },
  {
    title: 'After-Sales',
    description: 'Ongoing maintenance plans, parts supply, and dedicated support to keep everything running smoothly.',
  },
]

const guarantees = [
  {
    title: '12-Month Warranty',
    description: 'All new equipment comes with a comprehensive 12-month manufacturer warranty covering parts and labor.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
  },
  {
    title: '48-Hour Response',
    description: 'We guarantee a technician visit within 48 hours for any service request within our coverage area.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
  },
  {
    title: 'Satisfaction Guaranteed',
    description: 'If you are not completely satisfied with our service, we will make it right at no additional cost to you.',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg>',
  },
]
</script>
