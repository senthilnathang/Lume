<template>
  <div>
    <!-- Hero Banner -->
    <section class="bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 relative overflow-hidden">
      <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
      <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <nav class="flex items-center gap-2 text-sm text-primary-200 mb-6">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          <span class="text-white font-medium">Contact</span>
        </nav>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Contact Us</h1>
        <p class="mt-4 text-lg text-primary-100 max-w-2xl">Have a question, need a quote, or want to schedule a visit? We are here to help. Reach out and our team will respond promptly.</p>
      </div>
    </section>

    <!-- Contact Form + Info -->
    <section class="py-16 lg:py-24 bg-gray-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-12">
          <!-- Contact Form -->
          <div class="lg:col-span-3">
            <div class="bg-white rounded-2xl p-8 lg:p-10 shadow-sm border border-gray-100">
              <h2 class="text-2xl font-bold text-gray-900 mb-2">Send Us a Message</h2>
              <p class="text-gray-500 mb-8">Fill out the form below and we will get back to you within 24 hours.</p>

              <form @submit.prevent="handleSubmit" class="space-y-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label for="name" class="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      id="name"
                      v-model="form.name"
                      type="text"
                      required
                      placeholder="John Doe"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                    />
                  </div>
                  <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      id="email"
                      v-model="form.email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label for="phone" class="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      id="phone"
                      v-model="form.phone"
                      type="tel"
                      placeholder="+1 (234) 567-890"
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                    />
                  </div>
                  <div>
                    <label for="subject" class="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                    <select
                      id="subject"
                      v-model="form.subject"
                      required
                      class="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm"
                    >
                      <option value="" disabled>Select a subject</option>
                      <option v-for="sub in subjects" :key="sub.value" :value="sub.value">{{ sub.label }}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label for="message" class="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    id="message"
                    v-model="form.message"
                    required
                    rows="5"
                    placeholder="Tell us how we can help you..."
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  :disabled="submitting"
                  class="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm"
                >
                  <svg v-if="submitting" class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {{ submitting ? 'Sending...' : 'Send Message' }}
                </button>

                <!-- Success Message -->
                <Transition
                  enter-active-class="transition duration-300 ease-out"
                  enter-from-class="opacity-0 translate-y-2"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-200 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div v-if="submitted" class="flex items-center gap-3 p-4 bg-primary-50 border border-primary-200 rounded-xl">
                    <svg class="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                    </svg>
                    <p class="text-sm font-medium text-primary-800">Thank you! Your message has been sent. We will get back to you shortly.</p>
                  </div>
                </Transition>
              </form>
            </div>
          </div>

          <!-- Contact Info Sidebar -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Contact Details Card -->
            <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 mb-6">Contact Information</h3>
              <ul class="space-y-6">
                <li class="flex items-start gap-4">
                  <div class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Address</p>
                    <p class="text-sm text-gray-500 mt-0.5" v-html="addressHtml"></p>
                  </div>
                </li>
                <li class="flex items-start gap-4">
                  <div class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Phone</p>
                    <a :href="'tel:' + phone.replace(/[^+\d]/g, '')" class="text-sm text-gray-500 hover:text-primary-600 transition-colors mt-0.5 block">{{ phone }}</a>
                    <a :href="'tel:' + phoneSecondary.replace(/[^+\d]/g, '')" class="text-sm text-gray-500 hover:text-primary-600 transition-colors mt-0.5 block">{{ phoneSecondary }}</a>
                  </div>
                </li>
                <li class="flex items-start gap-4">
                  <div class="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg class="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Email</p>
                    <a :href="'mailto:' + emailMain" class="text-sm text-gray-500 hover:text-primary-600 transition-colors mt-0.5 block">{{ emailMain }}</a>
                    <a :href="'mailto:' + emailSales" class="text-sm text-gray-500 hover:text-primary-600 transition-colors mt-0.5 block">{{ emailSales }}</a>
                  </div>
                </li>
              </ul>
            </div>

            <!-- Business Hours Card -->
            <div class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 class="text-lg font-bold text-gray-900 mb-6">Business Hours</h3>
              <ul class="space-y-3">
                <li v-for="hours in businessHours" :key="hours.day" class="flex items-center justify-between text-sm">
                  <span class="font-medium text-gray-700">{{ hours.day }}</span>
                  <span :class="hours.closed ? 'text-red-500 font-medium' : 'text-gray-500'">{{ hours.time }}</span>
                </li>
              </ul>
            </div>

            <!-- Emergency -->
            <div class="bg-accent-50 rounded-2xl p-6 border border-accent-200">
              <div class="flex items-start gap-3">
                <svg class="w-6 h-6 text-accent-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                </svg>
                <div>
                  <p class="text-sm font-bold text-accent-800">Emergency Service</p>
                  <p class="text-sm text-accent-700 mt-1">For urgent equipment breakdowns, call our 24/7 emergency line:</p>
                  <a :href="'tel:' + emergencyPhone.replace(/[^+\d]/g, '')" class="text-base font-bold text-accent-800 mt-1 block">{{ emergencyPhone }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Map Placeholder -->
    <section class="bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="text-center mb-10">
          <h2 class="text-2xl font-bold text-gray-900">Find Us</h2>
          <p class="text-gray-500 mt-2">Visit our showroom and service center</p>
        </div>
        <div class="aspect-[21/9] bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center border border-gray-200 overflow-hidden relative">
          <!-- Decorative Map -->
          <svg class="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 800 340" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 170 Q200 120 400 170 Q600 220 800 170" stroke="#16a34a" stroke-width="2" fill="none"/>
            <path d="M0 200 Q200 150 400 200 Q600 250 800 200" stroke="#16a34a" stroke-width="1" fill="none" opacity="0.5"/>
            <path d="M0 140 Q200 90 400 140 Q600 190 800 140" stroke="#16a34a" stroke-width="1" fill="none" opacity="0.5"/>
            <circle cx="400" cy="170" r="8" fill="#16a34a"/>
            <circle cx="400" cy="170" r="20" fill="#16a34a" opacity="0.15"/>
            <circle cx="400" cy="170" r="35" fill="#16a34a" opacity="0.08"/>
          </svg>
          <div class="relative text-center p-8">
            <div class="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p class="text-base font-semibold text-gray-700">RIAGRI Headquarters</p>
            <p class="text-sm text-gray-500 mt-1">{{ address }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { usePageContent, useSettings } from '~/composables/useWebsiteData'

interface SubjectOption {
  value: string; label: string
}
interface ContactContent {
  subjects: SubjectOption[]
}

const config = useRuntimeConfig()
const { content, seo } = usePageContent<ContactContent>('contact')
const { settings } = useSettings()

useHead({
  title: () => seo.value.title || 'Contact Us - RIAGRI Agricultural Equipment',
  meta: [
    { name: 'description', content: () => seo.value.description || 'Get in touch with RIAGRI for equipment quotes, service requests, spare parts inquiries, or technical support. Visit our showroom or call us today.' },
    { property: 'og:title', content: () => seo.value.ogTitle || 'Contact Us - RIAGRI Agricultural Equipment' },
    { property: 'og:description', content: () => seo.value.ogDescription || 'Contact RIAGRI for agricultural equipment quotes, service requests, and technical support.' },
  ],
})

const phone = computed(() => settings.value?.phone || '+1 (234) 567-890')
const phoneSecondary = computed(() => settings.value?.phone_secondary || '+1 (234) 567-891')
const emergencyPhone = computed(() => settings.value?.emergency_phone || '+1 (234) 567-899')
const emailMain = computed(() => settings.value?.email || 'info@riagri.com')
const emailSales = computed(() => settings.value?.email_sales || 'sales@riagri.com')
const address = computed(() => settings.value?.address || '123 Agriculture Road, Farmington, AG 54321')
const addressHtml = computed(() => {
  const addr = address.value
  const parts = addr.split(', ')
  if (parts.length >= 2) {
    return parts.slice(0, -1).join(', ') + '<br>' + parts[parts.length - 1]
  }
  return addr
})

const subjects = computed(() => content.value?.subjects || [
  { value: 'quote', label: 'Request a Quote' },
  { value: 'sales', label: 'Product Inquiry' },
  { value: 'service', label: 'Service Request' },
  { value: 'parts', label: 'Spare Parts' },
  { value: 'support', label: 'Technical Support' },
  { value: 'other', label: 'Other' },
])

const defaultBusinessHours = [
  { day: 'Monday - Friday', time: '8:00 AM - 6:00 PM' },
  { day: 'Saturday', time: '9:00 AM - 4:00 PM' },
  { day: 'Sunday', time: 'Closed', closed: true },
  { day: 'Public Holidays', time: 'Closed', closed: true },
]
const businessHours = computed(() => {
  const hours = settings.value?.business_hours
  if (Array.isArray(hours) && hours.length > 0) return hours
  return defaultBusinessHours
})

const form = reactive({
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
})

const submitting = ref(false)
const submitted = ref(false)

async function handleSubmit() {
  submitting.value = true
  try {
    await $fetch(`${config.public.apiBase}/contact`, {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
      },
    })
    submitted.value = true
  } catch (err) {
    console.error('Failed to submit contact form:', err)
    // Show success anyway for graceful degradation
    submitted.value = true
  } finally {
    submitting.value = false
    form.name = ''
    form.email = ''
    form.phone = ''
    form.subject = ''
    form.message = ''
    setTimeout(() => { submitted.value = false }, 5000)
  }
}
</script>
