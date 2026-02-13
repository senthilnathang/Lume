import { defineStore } from 'pinia';

interface UserInfo {
  id: number;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  current_company_id: number | null;
  two_factor_enabled: boolean;
  current_company?: {
    id: number;
    name: string;
    code: string;
  };
  companies?: Array<{
    id: number;
    name: string;
    code: string;
  }>;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  loginRedirectPath: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    refreshToken: null,
    userInfo: null,
    isLoggedIn: false,
    isLoading: false,
    loginRedirectPath: null,
  }),

  getters: {
    token: (state) => state.accessToken,
    user: (state) => state.userInfo,
    isSuperuser: (state) => state.userInfo?.is_superuser ?? false,
    currentCompanyId: (state) => state.userInfo?.current_company_id,
    currentCompany: (state) => state.userInfo?.current_company,
    userCompanies: (state) => state.userInfo?.companies ?? [],
    avatarUrl: (state) => state.userInfo?.avatar_url,
    fullName: (state) => state.userInfo?.full_name ?? '',
  },

  actions: {
    setToken(access: string, refresh?: string) {
      this.accessToken = access;
      if (refresh) this.refreshToken = refresh;
      this.isLoggedIn = true;

      if (import.meta.client) {
        localStorage.setItem('access_token', access);
        if (refresh) localStorage.setItem('refresh_token', refresh);
      }
    },

    setUserInfo(user: UserInfo) {
      this.userInfo = user;
    },

    async login(credentials: { username: string; password: string; totp_code?: string }) {
      this.isLoading = true;
      try {
        const data = await $fetch<{
          data: {
            accessToken: string;
            refreshToken: string;
            user: UserInfo;
            requires2FA?: boolean;
          };
        }>('/api/v1/auth/login', {
          method: 'POST',
          body: {
            identifier: credentials.username,
            password: credentials.password,
            totp_code: credentials.totp_code,
          },
        });

        if (data.data.requires2FA) {
          return { requires2FA: true };
        }

        this.setToken(data.data.accessToken, data.data.refreshToken);
        this.setUserInfo(data.data.user);

        return { success: true };
      } catch (error: any) {
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async register(payload: {
      email: string;
      username: string;
      password: string;
      full_name: string;
    }) {
      this.isLoading = true;
      try {
        const data = await $fetch<{
          data: { accessToken: string; refreshToken: string; user: UserInfo };
        }>('/api/v1/auth/register', {
          method: 'POST',
          body: payload,
        });

        this.setToken(data.data.accessToken, data.data.refreshToken);
        this.setUserInfo(data.data.user);
        return { success: true };
      } finally {
        this.isLoading = false;
      }
    },

    async fetchCurrentUser() {
      if (!this.accessToken) return;
      try {
        const data = await $fetch<{ data: UserInfo }>('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });
        this.setUserInfo(data.data);
      } catch {
        this.logout();
      }
    },

    async refreshAccessToken() {
      if (!this.refreshToken) return false;
      try {
        const data = await $fetch<{
          data: { accessToken: string; refreshToken?: string };
        }>('/api/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken: this.refreshToken },
        });

        this.setToken(data.data.accessToken, data.data.refreshToken);
        return true;
      } catch {
        this.logout();
        return false;
      }
    },

    async switchCompany(companyId: number) {
      try {
        const data = await $fetch<{
          data: { accessToken: string; company_id: number };
        }>('/api/v1/auth/company/switch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.accessToken}` },
          body: { company_id: companyId },
        });

        this.setToken(data.data.accessToken);
        if (this.userInfo) {
          this.userInfo.current_company_id = data.data.company_id;
        }
        return true;
      } catch {
        return false;
      }
    },

    async logout() {
      try {
        if (this.accessToken) {
          await $fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${this.accessToken}` },
          }).catch(() => {});
        }
      } finally {
        this.accessToken = null;
        this.refreshToken = null;
        this.userInfo = null;
        this.isLoggedIn = false;

        if (import.meta.client) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }

        navigateTo('/auth/login');
      }
    },

    initFromStorage() {
      if (!import.meta.client) return;
      const access = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      if (access) {
        this.accessToken = access;
        this.refreshToken = refresh;
        this.isLoggedIn = true;
      }
    },
  },
});
