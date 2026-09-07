import { AsyncLocalStorage } from 'async_hooks';

const store = new AsyncLocalStorage();

export function queryContextMiddleware(req, res, next) {
  store.run({ queries: 0, slow: 0, startedAt: Date.now() }, () => next());
}

export function currentQueryContext() {
  return store.getStore() || null;
}

export function slowQueryThresholdMs() {
  const raw = Number(process.env.SLOW_QUERY_MS ?? 50);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  return raw;
}

export function queryLabel(params) {
  const model = params?.model || 'raw';
  const action = params?.action || 'query';
  return `${model}.${action}`;
}

export function noteQuery(durationMs) {
  const ctx = currentQueryContext();
  if (ctx) {
    ctx.queries += 1;
    if (durationMs >= slowQueryThresholdMs() && slowQueryThresholdMs() > 0) {
      ctx.slow += 1;
    }
  }
  return ctx;
}

export function queryCountWarnThreshold() {
  const raw = Number(process.env.SLOW_QUERY_COUNT_WARN ?? 25);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

export function checkQueryCount(path) {
  const ctx = currentQueryContext();
  const threshold = queryCountWarnThreshold();
  if (ctx && threshold > 0 && ctx.queries >= threshold && !ctx.warned) {
    ctx.warned = true;
    console.warn(`[SlowQuery] ${ctx.queries} DB queries on ${path || 'unknown path'} (threshold ${threshold})`);
  }
}

export default { queryContextMiddleware, currentQueryContext, slowQueryThresholdMs, queryLabel, noteQuery, queryCountWarnThreshold, checkQueryCount };
