<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';
import { useCompanyStore } from '~/stores/company';

const authStore = useAuthStore();
const companyStore = useCompanyStore();

const isOpen = ref(false);
const isSwitching = ref(false);

async function switchTo(companyId: number) {
  if (companyId === companyStore.companyId) {
    isOpen.value = false;
    return;
  }

  isSwitching.value = true;
  const success = await companyStore.switchCompany(companyId);
  isSwitching.value = false;
  isOpen.value = false;

  if (success) {
    // Reload page to refresh data with new company context
    window.location.reload();
  }
}
</script>

<template>
  <div class="relative" v-if="companyStore.hasMultipleCompanies">
    <button @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <span class="text-gray-700">{{ companyStore.companyName }}</span>
      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div v-if="isOpen" class="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
      <button v-for="company in companyStore.companies" :key="company.id"
        @click="switchTo(company.id)"
        class="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
        :class="company.id === companyStore.companyId ? 'text-primary-700 bg-primary-50' : 'text-gray-700'"
        :disabled="isSwitching">
        <span>{{ company.name }}</span>
        <span class="text-xs text-gray-400 ml-auto">{{ company.code }}</span>
      </button>
    </div>
  </div>
</template>
