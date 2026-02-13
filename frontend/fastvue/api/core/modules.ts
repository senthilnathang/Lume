import { requestClient } from '#/api/request';

/**
 * Module API Namespace
 */
export namespace ModulesApi {
  /** Module state */
  export type ModuleState =
    | 'installed'
    | 'uninstalled'
    | 'to_install'
    | 'to_upgrade'
    | 'to_remove';

  /** Module info */
  export interface Module {
    id: number;
    name: string;
    display_name: string;
    version: string;
    summary: string | null;
    description: string | null;
    author: string | null;
    website: string | null;
    category: string | null;
    license: string | null;
    application: boolean;
    state: ModuleState;
    installed_at: string | null;
    updated_at: string | null;
    depends: string[];
    auto_install: boolean;
    module_path: string | null;
  }

  /** Module list query params */
  export interface ModuleListParams {
    installed_only?: boolean;
    category?: string;
    application_only?: boolean;
  }

  /** Module installation result */
  export interface InstallResult {
    success: boolean;
    module?: Module;
    message?: string;
    installed_dependencies?: string[];
  }

  /** Module uninstall result */
  export interface UninstallResult {
    success: boolean;
    message?: string;
  }

  /** Frontend config for module */
  export interface FrontendConfig {
    name: string;
    displayName: string;
    routes?: string;
    stores?: string[];
    components?: string[];
    views?: string[];
    locales?: string[];
    menus?: MenuItem[];
  }

  /** Menu item */
  export interface MenuItem {
    id: string;
    name: string;
    path?: string;
    icon?: string;
    parentId?: string;
    sequence?: number;
    module?: string;
    children?: MenuItem[];
  }
}

/**
 * Get all modules
 */
export async function getModulesApi(params?: ModulesApi.ModuleListParams) {
  return requestClient.get<ModulesApi.Module[]>('/modules/', { params });
}

/**
 * Get installed modules
 */
export async function getInstalledModulesApi() {
  return requestClient.get<ModulesApi.Module[]>('/modules/', {
    params: { installed_only: true },
  });
}

/**
 * Get module by name
 */
export async function getModuleApi(name: string) {
  return requestClient.get<ModulesApi.Module>(`/modules/${name}`);
}

/**
 * Install a module
 */
export async function installModuleApi(name: string) {
  return requestClient.post<ModulesApi.InstallResult>(
    `/modules/install/${name}`,
  );
}

/**
 * Uninstall a module
 */
export async function uninstallModuleApi(name: string) {
  return requestClient.post<ModulesApi.UninstallResult>(
    `/modules/uninstall/${name}`,
  );
}

/**
 * Upgrade a module
 */
export async function upgradeModuleApi(name: string) {
  return requestClient.post<ModulesApi.InstallResult>(`/modules/upgrade/${name}`);
}

/**
 * Upload a module ZIP file
 */
export async function uploadModuleApi(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return requestClient.post<ModulesApi.InstallResult>(
    '/modules/upload',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );
}

/**
 * Get module dependencies
 */
export async function getModuleDependenciesApi(name: string) {
  return requestClient.get<string[]>(`/modules/${name}/dependencies`);
}

/**
 * Get frontend configurations for all installed modules
 */
export async function getModuleFrontendConfigsApi() {
  return requestClient.get<ModulesApi.FrontendConfig[]>(
    '/modules/installed/frontend-config',
  );
}

/**
 * Get all menus from installed modules
 */
export async function getModuleMenusApi() {
  return requestClient.get<ModulesApi.MenuItem[]>('/modules/installed/menus');
}

/**
 * Get modules by category
 */
export async function getModulesByCategoryApi(category: string) {
  return requestClient.get<ModulesApi.Module[]>('/modules/', {
    params: { category },
  });
}

/**
 * Get application modules only
 */
export async function getApplicationModulesApi() {
  return requestClient.get<ModulesApi.Module[]>('/modules/', {
    params: { application_only: true },
  });
}
