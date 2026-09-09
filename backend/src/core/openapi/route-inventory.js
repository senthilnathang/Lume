const AUTH_MIDDLEWARE = new Set([
  'authenticate',
  'authorize',
  'requireScopes',
  'optionalAuth',
  'authenticateApiKey',
]);

function joinPaths(base, sub) {
  const clean = (s) => String(s || '').replace(/\/+$/, '');
  if (!sub || sub === '/') {
    return clean(base) || '/';
  }
  return `${clean(base)}/${String(sub).replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/');
}

function expressPathToOpenApi(expressPath) {
  return String(expressPath).replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

export function inventoryRoutes(app) {
  const routes = [];
  const stack = app?._router?.stack || [];
  walkStack(stack, '', routes);
  return routes;
}

function walkStack(stack, basePath, out) {
  for (const layer of stack || []) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods || {}).filter((m) => layer.route.methods[m]);
      const subPaths = layer.route.path instanceof Array ? layer.route.path : [layer.route.path];
      const handlers = (layer.route.stack || []).map((l) => l.handle?.name || 'anonymous');
      const hasAuth = handlers.some((name) => AUTH_MIDDLEWARE.has(name));
      for (const method of methods) {
        for (const sub of subPaths) {
          out.push({
            method: method.toUpperCase(),
            path: expressPathToOpenApi(joinPaths(basePath, sub)),
            hasAuth,
            handlers,
          });
        }
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const mount = layer.regexp?.fast_slash
        ? ''
        : regexpToPrefix(layer.regexp);
      walkStack(layer.handle.stack, joinPaths(basePath, mount), out);
    }
  }
}

function regexpToPrefix(regexp) {
  if (!regexp) {
    return '';
  }
  const source = regexp.source
    .replace(/^\^/, '')
    .replace(/\\\//g, '/')
    .replace(/\(\?=[^)]*\)/g, '')
    .replace(/\/?\$.*$/, '')
    .replace(/\?\/$/, '');
  const literal = source.split('(')[0].replace(/\?$/, '').replace(/\/+$/, '');
  return literal.startsWith('/') ? literal : `/${literal}`;
}

export function tagForPath(openApiPath) {
  const segments = String(openApiPath).split('/').filter((s) => s && !s.startsWith('{') && s !== 'api');
  if (!segments.length) {
    return 'Platform';
  }
  const first = segments[0].replace(/[-_]/g, ' ');
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function inventoryToPaths(routes, existingPaths = {}) {
  const paths = {};
  for (const route of routes) {
    if (existingPaths[route.path]?.[route.method.toLowerCase()]) {
      continue;
    }
    const operation = {
      tags: [tagForPath(route.path)],
      summary: `${route.method} ${route.path}`,
      responses: {
        200: { description: 'Successful response' },
        400: { description: 'Bad request' },
      },
    };
    if (route.hasAuth) {
      operation.security = [{ bearerAuth: [] }];
    }
    paths[route.path] = paths[route.path] || {};
    paths[route.path][route.method.toLowerCase()] = operation;
  }
  return paths;
}

export default { inventoryRoutes, inventoryToPaths, tagForPath };
