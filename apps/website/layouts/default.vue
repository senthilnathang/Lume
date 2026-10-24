<template>
  <div class="min-h-screen flex flex-col bg-white">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16 lg:h-20">
          <!-- Logo -->
          <NuxtLink to="/" class="flex items-center gap-2.5 group">
            <div class="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
              <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3C9 3 6 6.5 6 12c0 3.5 1.5 6 3.5 7.5C10.5 20.2 11.2 20.5 12 21c.8-.5 1.5-.8 2.5-1.5C16.5 18 18 15.5 18 12c0-5.5-3-9-6-9z" fill="currentColor" opacity="0.3"/>
                <path d="M12 5c-.8 1.5-1.5 4-1.5 7s.4 4.5 1.5 6c1.1-1.5 1.5-3 1.5-6s-.7-5.5-1.5-7z" fill="currentColor"/>
                <path d="M8 11c1.5.4 3 .8 4 1.5m0 0c1-.7 2.5-1.1 4-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <span class="text-2xl font-extrabold tracking-tight text-gray-900">{{ siteName }}</span>
          </NuxtLink>

          <!-- Desktop Navigation -->
          <nav class="hidden lg:flex items-center gap-1">
            <template v-for="link in navLinks" :key="link.url">
              <!-- Item with children: dropdown -->
              <div v-if="link.children?.length" class="relative group" @mouseenter="openDropdown = link.url" @mouseleave="openDropdown = null">
                <NuxtLink
                  :to="link.url"
                  class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200 inline-flex items-center gap-1"
                  active-class="!text-primary-700 !bg-primary-50"
                >
                  {{ link.label }}
                  <svg class="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-500 transition-transform duration-200" :class="{ 'rotate-180': openDropdown === link.url }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </NuxtLink>
                <Transition
                  enter-active-class="transition duration-150 ease-out"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <div v-show="openDropdown === link.url" class="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <NuxtLink
                      v-for="child in link.children"
                      :key="child.url"
                      :to="child.url"
                      :target="child.target !== '_self' ? child.target : undefined"
                      class="block px-4 py-2.5 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                      @click="openDropdown = null"
                    >
                      <span class="font-medium">{{ child.label }}</span>
                      <span v-if="child.description" class="block text-xs text-gray-400 mt-0.5">{{ child.description }}</span>
                    </NuxtLink>
                  </div>
                </Transition>
              </div>
              <!-- Simple item -->
              <NuxtLink
                v-else
                :to="link.url"
                class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-primary-700 hover:bg-primary-50 transition-all duration-200"
                active-class="!text-primary-700 !bg-primary-50"
              >
                {{ link.label }}
              </NuxtLink>
            </template>
          </nav>

          <!-- CTA + Mobile Toggle -->
          <div class="flex items-center gap-3">
            <NuxtLink
              to="/contact"
              class="hidden sm:inline-flex items-center px-5 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 shadow-md hover:shadow-lg transition-all duration-200"
            >
              Get a Quote
            </NuxtLink>

            <!-- Mobile Menu Button -->
            <button
              class="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
              @click="mobileMenuOpen = !mobileMenuOpen"
              aria-label="Toggle menu"
            >
              <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 -translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-2"
        >
          <div v-if="mobileMenuOpen" class="lg:hidden pb-4 border-t border-gray-100 mt-2 pt-4">
            <nav class="flex flex-col gap-1">
              <template v-for="link in navLinks" :key="link.url">
                <!-- Item with children: accordion -->
                <div v-if="link.children?.length">
                  <button
                    class="w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition-all"
                    @click="mobileExpanded === link.url ? (mobileExpanded = null) : (mobileExpanded = link.url)"
                  >
                    {{ link.label }}
                    <svg class="w-4 h-4 text-gray-400 transition-transform duration-200" :class="{ 'rotate-180': mobileExpanded === link.url }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                  <Transition
                    enter-active-class="transition duration-200 ease-out"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-96"
                    leave-active-class="transition duration-150 ease-in"
                    leave-from-class="opacity-100 max-h-96"
                    leave-to-class="opacity-0 max-h-0"
                  >
                    <div v-show="mobileExpanded === link.url" class="overflow-hidden pl-4">
                      <NuxtLink
                        :to="link.url"
                        class="block px-4 py-2.5 rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-all"
                        @click="mobileMenuOpen = false"
                      >
                        All {{ link.label }}
                      </NuxtLink>
                      <NuxtLink
                        v-for="child in link.children"
                        :key="child.url"
                        :to="child.url"
                        :target="child.target !== '_self' ? child.target : undefined"
                        class="block px-4 py-2.5 rounded-lg text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 transition-all"
                        @click="mobileMenuOpen = false"
                      >
                        {{ child.label }}
                      </NuxtLink>
                    </div>
                  </Transition>
                </div>
                <!-- Simple item -->
                <NuxtLink
                  v-else
                  :to="link.url"
                  class="px-4 py-3 rounded-xl text-base font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition-all"
                  active-class="!text-primary-700 !bg-primary-50"
                  @click="mobileMenuOpen = false"
                >
                  {{ link.label }}
                </NuxtLink>
              </template>
              <NuxtLink
                to="/contact"
                class="mt-2 px-4 py-3 bg-primary-600 text-white text-center font-semibold rounded-xl hover:bg-primary-700 transition-colors sm:hidden"
                @click="mobileMenuOpen = false"
              >
                Get a Quote
              </NuxtLink>
            </nav>
          </div>
        </Transition>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-900 text-gray-300">
      <!-- Main Footer -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <!-- Brand Column -->
          <div class="lg:col-span-1">
            <NuxtLink to="/" class="flex items-center gap-2.5 mb-5">
              <div class="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3C9 3 6 6.5 6 12c0 3.5 1.5 6 3.5 7.5C10.5 20.2 11.2 20.5 12 21c.8-.5 1.5-.8 2.5-1.5C16.5 18 18 15.5 18 12c0-5.5-3-9-6-9z" fill="currentColor" opacity="0.3"/>
                  <path d="M12 5c-.8 1.5-1.5 4-1.5 7s.4 4.5 1.5 6c1.1-1.5 1.5-3 1.5-6s-.7-5.5-1.5-7z" fill="currentColor"/>
                </svg>
              </div>
              <span class="text-2xl font-extrabold text-white">RI<span class="text-primary-500">AGRI</span></span>
            </NuxtLink>
            <p class="text-gray-400 text-sm leading-relaxed mb-6">
              Empowering modern agriculture with premium equipment, reliable transport solutions, and expert service since 2009.
            </p>
            <!-- Social Icons -->
            <div class="flex items-center gap-3">
              <a v-for="social in socials" :key="social.label" :href="social.href" target="_blank" rel="noopener" :aria-label="social.label"
                class="w-9 h-9 rounded-lg bg-gray-800 hover:bg-primary-600 flex items-center justify-center transition-colors duration-200">
                <svg class="w-4 h-4 text-gray-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24" v-html="social.icon" />
              </a>
            </div>
          </div>

          <!-- Products Column -->
          <div>
            <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Products</h3>
            <ul class="space-y-3">
              <li v-for="item in footerProductsList" :key="item">
                <NuxtLink to="/products" class="text-sm text-gray-400 hover:text-primary-400 transition-colors">{{ item }}</NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Services Column -->
          <div>
            <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Services</h3>
            <ul class="space-y-3">
              <li v-for="item in footerServicesList" :key="item">
                <NuxtLink to="/services" class="text-sm text-gray-400 hover:text-primary-400 transition-colors">{{ item }}</NuxtLink>
              </li>
            </ul>
          </div>

          <!-- Contact Column -->
          <div>
            <h3 class="text-white font-semibold text-sm uppercase tracking-wider mb-5">Contact</h3>
            <ul class="space-y-4">
              <li class="flex items-start gap-3">
                <svg class="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span class="text-sm text-gray-400" v-html="addressHtml"></span>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                </svg>
                <a :href="`tel:${phoneClean}`" class="text-sm text-gray-400 hover:text-primary-400 transition-colors">{{ phone }}</a>
              </li>
              <li class="flex items-center gap-3">
                <svg class="w-5 h-5 text-primary-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <a :href="`mailto:${email}`" class="text-sm text-gray-400 hover:text-primary-400 transition-colors">{{ email }}</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="border-t border-gray-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p class="text-xs text-gray-500">&copy; {{ new Date().getFullYear() }} {{ siteName }}. All rights reserved.</p>
          <div class="flex items-center gap-6">
            <NuxtLink to="/privacy" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Privacy Policy</NuxtLink>
            <NuxtLink to="/terms" class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Terms of Service</NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
const mobileMenuOpen = ref(false)
const openDropdown = ref<string | null>(null)
const mobileExpanded = ref<string | null>(null)

// Fetch dynamic data from CMS
const { settings } = useSettings()
const { items: headerMenuItems } = useMenu('header')

// Derived values with fallbacks
const siteName = computed(() => settings.value.site_name || 'RIAGRI')
const phone = computed(() => settings.value.phone || '')
const phoneClean = computed(() => phone.value.replace(/[^+\d]/g, ''))
const email = computed(() => settings.value.email || 'contact@example.com')
const address = computed(() => settings.value.address || '')
const addressHtml = computed(() => address.value.replace(', ', ',<br>'))

const navLinks = computed(() => {
  if (headerMenuItems.value.length > 0) {
    return headerMenuItems.value.map(item => ({
      label: item.label,
      url: item.url || '/',
      target: item.target || '_self',
      description: item.description,
      children: item.children?.map(child => ({
        label: child.label,
        url: child.url || '/',
        target: child.target || '_self',
        description: child.description,
      })) || [],
    }))
  }
  // Fallback
  return [
    { label: 'Home', url: '/', children: [] },
    { label: 'Products', url: '/products', children: [] },
    { label: 'Services', url: '/services', children: [] },
    { label: 'About', url: '/about', children: [] },
    { label: 'Contact', url: '/contact', children: [] },
  ]
})

const footerProductsList = computed(() => {
  const v = settings.value.footer_products
  if (Array.isArray(v)) return v
  return []
})

const footerServicesList = computed(() => {
  const v = settings.value.footer_services
  if (Array.isArray(v)) return v
  return []
})

const socials = [
  { label: 'Facebook', href: '#', icon: '<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>' },
  { label: 'Twitter', href: '#', icon: '<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>' },
  { label: 'LinkedIn', href: '#', icon: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>' },
]

// Close mobile menu on route change
const route = useRoute()
watch(() => route.path, () => {
  mobileMenuOpen.value = false
})
</script>
