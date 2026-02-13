/**
 * Modules API
 * API for managing installed and available modules
 */
import { requestClient } from './request';

export namespace ModulesApi {
  export interface Module {
    id?: number;
    name: string;
    display_name: string;
    version: string;
    summary?: string;
    description?: string;
    author?: string;
    website?: string;
    category?: string;
    license?: string;
    application?: boolean;
    state: 'installed' | 'uninstalled' | 'to_install' | 'to_upgrade' | 'to_remove';
    depends?: string[];
    installed_at?: string;
    module_path?: string;
  }

  export interface InstallResult {
    success: boolean;
    message: string;
    module?: Module;
  }
}

/**
 * Get all modules (installed and available)
 */
export async function getModulesApi(params?: {
  installed_only?: boolean;
  category?: string;
  application_only?: boolean;
}): Promise<ModulesApi.Module[]> {
  return requestClient.get<ModulesApi.Module[]>('/modules/', { params });
}

/**
 * Get installed modules only
 */
export async function getInstalledModulesApi(): Promise<ModulesApi.Module[]> {
  return requestClient.get<ModulesApi.Module[]>('/modules/installed');
}

/**
 * Install a module
 * @param moduleName - Name of the module to install
 * @param options - Optional settings
 * @param options.skipValidation - Skip schema validation (use for breaking changes)
 */
export async function installModuleApi(
  moduleName: string,
  options?: { skipValidation?: boolean }
): Promise<ModulesApi.InstallResult> {
  const params = options?.skipValidation ? { skip_validation: 'true' } : undefined;
  return requestClient.post<ModulesApi.InstallResult>(
    `/modules/install/${moduleName}`,
    null,
    { params }
  );
}

/**
 * Uninstall a module
 */
export async function uninstallModuleApi(moduleName: string): Promise<ModulesApi.InstallResult> {
  return requestClient.post<ModulesApi.InstallResult>(`/modules/uninstall/${moduleName}`);
}

/**
 * Upgrade a module
 */
export async function upgradeModuleApi(moduleName: string): Promise<ModulesApi.InstallResult> {
  return requestClient.post<ModulesApi.InstallResult>(`/modules/upgrade/${moduleName}`);
}

/**
 * Upload a module package
 */
export async function uploadModuleApi(file: File): Promise<ModulesApi.InstallResult> {
  const formData = new FormData();
  formData.append('file', file);
  return requestClient.post<ModulesApi.InstallResult>('/modules/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

/**
 * Get module details
 */
export async function getModuleDetailsApi(moduleName: string): Promise<ModulesApi.Module> {
  return requestClient.get<ModulesApi.Module>(`/modules/${moduleName}`);
}
