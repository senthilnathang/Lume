import { defineStore } from 'pinia';

interface Company {
  id: number;
  name: string;
  code: string;
  parent_company_id: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  is_headquarters: boolean;
}

interface CompanyState {
  currentCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
}

export const useCompanyStore = defineStore('company', {
  state: (): CompanyState => ({
    currentCompany: null,
    companies: [],
    isLoading: false,
  }),

  getters: {
    companyId: (state) => state.currentCompany?.id,
    companyName: (state) => state.currentCompany?.name ?? '',
    companyCode: (state) => state.currentCompany?.code ?? '',
    hasMultipleCompanies: (state) => state.companies.length > 1,
  },

  actions: {
    setCurrentCompany(company: Company) {
      this.currentCompany = company;
    },

    setCompanies(companies: Company[]) {
      this.companies = companies;
    },

    async fetchCompanies() {
      this.isLoading = true;
      try {
        const data = await $fetch<{ data: Company[] }>('/api/v1/companies', {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        this.companies = data.data;
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async switchCompany(companyId: number) {
      const { useAuthStore } = await import('./auth');
      const authStore = useAuthStore();
      const success = await authStore.switchCompany(companyId);
      if (success) {
        const company = this.companies.find((c) => c.id === companyId);
        if (company) this.currentCompany = company;
      }
      return success;
    },

    $reset() {
      this.currentCompany = null;
      this.companies = [];
      this.isLoading = false;
    },
  },
});
