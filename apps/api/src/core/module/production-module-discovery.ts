import { createRequire } from 'node:module';
import { realpath, stat } from 'node:fs/promises';
import { resolve, isAbsolute, extname } from 'node:path';
import { ModuleDefinition } from './define-module';
import { BUILTIN_MODULE_NAMES } from '@modules/base/builtin-modules';

/** Explicit deployment-owned CommonJS entrypoints; never infer executable code from DB rows. */
export async function discoverProductionModules(raw = process.env.MODULE_ENTRYPOINTS, cwd = process.cwd()): Promise<ModuleDefinition[]> {
  if (!raw?.trim()) return [];
  let entries: unknown;
  try { entries = JSON.parse(raw); } catch { throw new Error('MODULE_ENTRYPOINTS must be a JSON array'); }
  if (!Array.isArray(entries) || entries.length > 64) throw new Error('MODULE_ENTRYPOINTS must contain at most 64 entries');
  const requireModule = createRequire(resolve(cwd, 'package.json'));
  const targets: Array<{ filename: string; exportName: string }> = [];
  const seen = new Set<string>();
  // Resolve every target before executing any entrypoint.
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      Object.keys(entry).some(key => !['specifier', 'export'].includes(key)) ||
      typeof entry.specifier !== 'string' || !entry.specifier.trim() ||
      (entry.export !== undefined && (typeof entry.export !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(entry.export)))) {
      throw new Error('Each module entry requires a specifier and optional named export');
    }
    const specifier = entry.specifier;
    const local = isAbsolute(specifier) || specifier.startsWith('./') || specifier.startsWith('../');
    if (!local && !/^(?:@[a-z0-9_-][a-z0-9_.-]*\/)?[a-z0-9_-][a-z0-9_.-]*(?:\/[a-zA-Z0-9_.-]+)*$/.test(specifier)) throw new Error('Module specifier must be a local file or installed package');
    const filename = await realpath(local ? resolve(cwd, specifier) : requireModule.resolve(specifier));
    if (!['.js', '.cjs'].includes(extname(filename)) || !(await stat(filename)).isFile()) throw new Error('Module entrypoints must be precompiled CommonJS .js or .cjs files');
    const exportName = entry.export ?? 'default', key = `${filename}:${exportName}`;
    if (seen.has(key)) throw new Error('Duplicate module entrypoint');
    seen.add(key); targets.push({ filename, exportName });
  }
  const definitions: ModuleDefinition[] = [];
  for (const { filename, exportName } of targets) {
    const exported = requireModule(filename);
    const definition = exportName === 'default'
      ? (Object.prototype.hasOwnProperty.call(exported ?? {}, 'default') ? exported.default : exported)
      : (Object.prototype.hasOwnProperty.call(exported ?? {}, exportName) ? exported[exportName] : undefined);
    if (!definition || typeof definition !== 'object' || Array.isArray(definition) ||
      typeof definition.name !== 'string' || !/^[a-z][a-z0-9_.-]{0,99}$/.test(definition.name) ||
      typeof definition.version !== 'string' || !definition.version.trim() || definition.version.length > 50) {
      throw new Error(`Module export '${exportName}' must be a runtime ModuleDefinition with name and version`);
    }
    if (Object.values(BUILTIN_MODULE_NAMES).includes(definition.name)) throw new Error(`Module name is reserved for deployment: ${definition.name}`);
    for (const key of ['depends', 'entities', 'workflows', 'views', 'permissions', 'services']) {
      if (definition[key] !== undefined && !Array.isArray(definition[key])) throw new Error(`Invalid module ${key}: ${definition.name}`);
    }
    if (definition.depends?.some((name: unknown) => typeof name !== 'string' || !/^[a-z][a-z0-9_.-]{0,99}$/.test(name))) throw new Error(`Invalid module dependencies: ${definition.name}`);
    if (definition.services?.length) throw new Error('Runtime service providers require Nest deployment registration');
    if (definition.hooks != null) {
      if (typeof definition.hooks !== 'object' || Array.isArray(definition.hooks) || Object.keys(definition.hooks).some(key => !['onInstall', 'onUninstall', 'onLoad', 'onReload', 'onUpgrade'].includes(key)) || Object.values(definition.hooks).some(hook => typeof hook !== 'function')) throw new Error(`Invalid module hooks: ${definition.name}`);
    }
    if (definition.configuration && (typeof definition.configuration.validate !== 'function' || typeof definition.hooks?.onLoad !== 'function')) throw new Error(`Configurable module requires validation and onLoad: ${definition.name}`);
    definitions.push(definition);
  }
  return definitions;
}
