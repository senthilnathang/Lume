import { defineStore } from 'pinia';

import { getMyCompaniesApi } from '#/api/core/company';
import { type AuthApi } from '#/api/core/auth';

const STORAGE_KEY = 'selected_company';

// Unified company type for the store
interface StoreCompany {
  id: number;
  name: string;
  code: string;
  is_default?: boolean;
}

interface CompanyState {
  companies: StoreCompany[];
  selectedCompany: StoreCompany | null;
  loading: boolean;
}

export const useCompanyStore = defineStore('company', {
  state: (): CompanyState => ({
    companies: [],
    selectedCompany: null,
    loading: false,
  }),

  getters: {
    /**
     * Get the selected company ID for filtering
     */
    selectedCompanyId(): number | null {
      return this.selectedCompany?.id || null;
    },

    /**
     * Check if a company is selected
     */
    hasSelectedCompany(): boolean {
      return this.selectedCompany !== null;
    },

    /**
     * Get company name for display
     */
    selectedCompanyName(): string {
      return this.selectedCompany?.name || 'All Companies';
    },

    /**
     * Get all available companies
     */
    availableCompanies(): StoreCompany[] {
      return this.companies;
    },

    /**
     * Get current company (alias for selectedCompany)
     */
    currentCompany(): StoreCompany | null {
      return this.selectedCompany;
    },
  },

  actions: {
    /**
     * Initialize the store - restore from localStorage and fetch companies
     */
    async initialize() {
      // Restore from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          this.selectedCompany = parsed;
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Fetch available companies
      await this.fetchCompanies();
    },

    /**
     * Set companies from login response
     */
    setCompanies(companies: AuthApi.CompanyInfo[]) {
      this.companies = companies.map(c => ({
        id: c.id,
        name: c.name,
        code: c.code,
        is_default: c.is_default,
      }));
    },

    /**
     * Set current company from login response
     */
    setCurrentCompany(company: AuthApi.CompanyInfo | StoreCompany) {
      this.selectedCompany = {
        id: company.id,
        name: company.name,
        code: company.code,
        is_default: 'is_default' in company ? company.is_default : true,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.selectedCompany));
    },

    /**
     * Fetch available companies from API
     */
    async fetchCompanies() {
      this.loading = true;
      try {
        const response = await getMyCompaniesApi();
        this.companies = response.map(c => ({
          id: c.id,
          name: c.name,
          code: c.code,
        }));

        // Validate that selected company still exists
        if (this.selectedCompany) {
          const exists = this.companies.find(
            (c) => c.id === this.selectedCompany?.id,
          );
          if (!exists) {
            this.clearSelection();
          }
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        this.loading = false;
      }
    },

    /**
     * Select a company for filtering
     */
    selectCompany(company: StoreCompany) {
      this.selectedCompany = company;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(company));

      // Dispatch event for components to react
      window.dispatchEvent(
        new CustomEvent('company-changed', { detail: company }),
      );
    },

    /**
     * Clear company selection (view all companies)
     */
    clearSelection() {
      this.selectedCompany = null;
      this.companies = [];
      localStorage.removeItem(STORAGE_KEY);

      // Dispatch event for components to react
      window.dispatchEvent(new CustomEvent('company-changed', { detail: null }));
    },

    /**
     * Get params object for API calls with company filter
     */
    getFilterParams(): { company_id?: number } {
      if (this.selectedCompany) {
        return { company_id: this.selectedCompany.id };
      }
      return {};
    },
  },
});
