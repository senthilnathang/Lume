/**
 * Modules API
 * API for managing installed and available modules
 */
import { get, post } from '@/api/request';

export interface Module {
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
  installable?: boolean;
  state: 'installed' | 'uninstalled' | 'to_install' | 'to_upgrade' | 'to_remove';
  depends?: string[];
  installed_at?: string | null;
  module_path?: string;
  loaded?: boolean;
  initialized?: boolean;
  permissions?: any[];
}

export interface ModuleActionResult {
  success: boolean;
  message: string;
  module?: Module;
}

export function getModules(): Promise<Module[]> {
  return get<Module[]>('/modules');
}

export function getModuleDetail(name: string): Promise<Module> {
  return get<Module>(`/modules/${name}`);
}

export function installModule(name: string): Promise<ModuleActionResult> {
  return post<ModuleActionResult>(`/modules/${name}/install`);
}

export function uninstallModule(name: string): Promise<ModuleActionResult> {
  return post<ModuleActionResult>(`/modules/${name}/uninstall`);
}

export function upgradeModule(name: string): Promise<ModuleActionResult> {
  return post<ModuleActionResult>(`/modules/${name}/upgrade`);
}
