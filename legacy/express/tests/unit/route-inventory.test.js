import { inventoryRoutes, inventoryToPaths, tagForPath } from '../../src/core/openapi/route-inventory.js';

function layerRoute(method, path, ...handlerNames) {
  return {
    route: {
      path,
      methods: { [method]: true },
      stack: handlerNames.map((name) => ({ handle: { name } })),
    },
  };
}

describe('route inventory (F5.4)', () => {
  test('walks routes and router mounts with auth detection', () => {
    function authenticate() {}
    const app = {
      _router: {
        stack: [
          layerRoute('get', '/health'),
          layerRoute('post', '/api/users/login'),
          layerRoute('get', '/api/base/entities/:id', 'authenticate', 'anonymous'),
          {
            name: 'router',
            regexp: /^\/api\/sms\/?(?=\/|$)/i,
            handle: { stack: [layerRoute('post', '/send', 'authenticate', 'requireScopes')] },
          },
        ],
      },
    };
    const routes = inventoryRoutes(app);
    expect(routes).toHaveLength(4);
    expect(routes[2]).toMatchObject({ method: 'GET', path: '/api/base/entities/{id}', hasAuth: true });
    expect(routes[3]).toMatchObject({ method: 'POST', hasAuth: true });
    expect(routes[3].path).toMatch(/sms\/send$/);
  });

  test('skips paths already curated', () => {
    const routes = [{ method: 'GET', path: '/health', hasAuth: false, handlers: [] }];
    expect(inventoryToPaths(routes, { '/health': { get: { summary: 'x' } } })).toEqual({});
    const added = inventoryToPaths(routes, {});
    expect(added['/health'].get.summary).toBe('GET /health');
    expect(added['/health'].get.security).toBeUndefined();
  });

  test('derives tags from path segments', () => {
    expect(tagForPath('/api/base/entities/{id}')).toBe('Base');
    expect(tagForPath('/health')).toBe('Health');
    expect(tagForPath('/')).toBe('Platform');
  });
});
