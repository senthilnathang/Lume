import type { UserInfo } from '@vben/types';

import { ref } from 'vue';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import { getPermissionInfoApi, loginApi, logoutApi } from '#/api';
import { $t } from '#/locales';
import { router } from '#/router';

import { useCompanyStore } from './company';
import { usePermissionStore } from './permission';

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const companyStore = useCompanyStore();
  const permissionStore = usePermissionStore();

  const loginLoading = ref(false);
  const loginError = ref<string | null>(null);

  /**
   * Handle login process
   * @param params Login form data (username, password)
   * @param onSuccess Optional callback on successful login
   */
  async function authLogin(
    params: { password: string; username: string },
    onSuccess?: () => Promise<void> | void,
  ) {
    loginError.value = null;
    let userInfo: null | UserInfo = null;

    try {
      loginLoading.value = true;

      // Call FastAPI login API
      const loginResult = await loginApi(params);

      // Check if 2FA is required
      if (loginResult.requires_2fa) {
        // TODO: Handle 2FA flow
        throw new Error('Two-factor authentication required');
      }

      // Store JWT access token
      const accessToken = loginResult.access_token;

      if (accessToken) {
        accessStore.setAccessToken(accessToken);

        // Store refresh token if available
        if (loginResult.refresh_token) {
          localStorage.setItem('refresh_token', loginResult.refresh_token);
        }

        // Get user from login response
        const user = loginResult.user;

        // Determine user roles
        const userRoles: string[] = [];
        if (user.is_superuser) {
          userRoles.push('admin', 'superuser');
        }
        // Add roles from permissions if available
        if (loginResult.permissions.length > 0) {
          userRoles.push('user');
        }
        if (userRoles.length === 0) {
          userRoles.push('user');
        }

        // Map user to Vben UserInfo format
        // Use user's custom home path if set, otherwise fall back to global default
        userInfo = {
          userId: String(user.id),
          username: user.username,
          realName: user.full_name || user.username,
          avatar: user.avatar_url || '',
          desc: '',
          roles: userRoles,
          homePath: (user as any).default_home_path || preferences.app.defaultHomePath,
          token: accessToken,
        };

        // Store user info and access codes
        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(loginResult.permissions);

        // Set superuser flag in permission store
        permissionStore.setSuperuser(user.is_superuser);

        // Store companies for multi-company support
        if (loginResult.companies && loginResult.companies.length > 0) {
          companyStore.setCompanies(loginResult.companies);
          // Set default company
          const defaultCompany = loginResult.companies.find(c => c.is_default) || loginResult.companies[0];
          if (defaultCompany) {
            companyStore.setCurrentCompany(defaultCompany);
          }
        }

        // Clear login expired state
        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          // Navigate to dashboard or custom path
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo!.homePath || preferences.app.defaultHomePath,
              );
        }

        // Show success notification
        notification.success({
          description: `${$t('authentication.loginSuccessDesc') || 'Welcome back'}, ${userInfo!.realName}!`,
          duration: 3,
          message: $t('authentication.loginSuccess') || 'Login Successful',
        });
      }
    } catch (error: any) {
      // Handle login error
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Login failed. Please check your credentials.';

      loginError.value = errorMessage;

      notification.error({
        description: errorMessage,
        duration: 5,
        message: $t('authentication.loginFailed') || 'Login Failed',
      });

      throw error;
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  /**
   * Logout user
   * @param redirect Whether to redirect to login page
   */
  async function logout(redirect: boolean = true) {
    try {
      // Call logout API
      await logoutApi();
    } catch {
      // Silent fail - logout should always succeed on client side
    }

    // Clear refresh token
    localStorage.removeItem('refresh_token');

    // Clear all stores
    resetAllStores();
    companyStore.clearSelection();
    permissionStore.$reset();
    accessStore.setLoginExpired(false);

    // Redirect to login page
    if (redirect) {
      const currentPath = router.currentRoute.value.fullPath;
      // Don't set redirect query if already on login page to avoid loops
      if (currentPath.startsWith(LOGIN_PATH)) {
        await router.replace({ path: LOGIN_PATH });
      } else {
        await router.replace({
          path: LOGIN_PATH,
          query: {
            redirect: encodeURIComponent(currentPath),
          },
        });
      }
    } else {
      await router.replace({ path: LOGIN_PATH });
    }
  }

  /**
   * Fetch user info from API
   */
  async function fetchUserInfo(): Promise<UserInfo> {
    try {
      const permissionInfo = await getPermissionInfoApi();

      const userInfo: UserInfo = {
        userId: '0',
        username: '',
        realName: 'User',
        avatar: '',
        desc: '',
        roles: permissionInfo.roles,
        homePath: preferences.app.defaultHomePath,
        token: '',
      };

      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(permissionInfo.permissions);

      // Set superuser flag
      permissionStore.setSuperuser(permissionInfo.is_superuser);

      return userInfo;
    } catch {
      // Return default if API fails
      return {
        userId: '0',
        username: 'guest',
        realName: 'Guest',
        avatar: '',
        desc: '',
        roles: ['user'],
        homePath: preferences.app.defaultHomePath,
        token: '',
      };
    }
  }

  function $reset() {
    loginLoading.value = false;
    loginError.value = null;
  }

  return {
    // State
    loginLoading,
    loginError,
    // Actions
    authLogin,
    logout,
    fetchUserInfo,
    $reset,
  };
});
