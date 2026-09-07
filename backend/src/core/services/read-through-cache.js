export class ReadThroughCache {
  constructor({ ttlMs = 60 * 1000, maxEntries = 1000, clock = Date } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.clock = clock;
    this.entries = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  key(parts) {
    return (Array.isArray(parts) ? parts : [parts]).map((p) => String(p)).join(':');
  }

  get(parts) {
    const entry = this.entries.get(this.key(parts));
    if (!entry) {
      this.misses += 1;
      return undefined;
    }
    if (entry.expiresAt <= this.clock.now()) {
      this.entries.delete(this.key(parts));
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.value;
  }

  set(parts, value, ttlMs = this.ttlMs) {
    if (this.entries.size >= this.maxEntries && !this.entries.has(this.key(parts))) {
      const oldest = this.entries.keys().next().value;
      this.entries.delete(oldest);
    }
    this.entries.set(this.key(parts), { value, expiresAt: this.clock.now() + ttlMs });
    return value;
  }

  async load(parts, loader, ttlMs) {
    const cached = this.get(parts);
    if (cached !== undefined) {
      return cached;
    }
    const value = await loader();
    return this.set(parts, value, ttlMs);
  }

  invalidate(parts) {
    return this.entries.delete(this.key(parts));
  }

  invalidatePrefix(prefix) {
    const full = this.key(prefix) + ':';
    let removed = 0;
    for (const key of [...this.entries.keys()]) {
      if (key === this.key(prefix) || key.startsWith(full)) {
        this.entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    const size = this.entries.size;
    this.entries.clear();
    return size;
  }

  stats() {
    const total = this.hits + this.misses;
    return {
      entries: this.entries.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total ? Math.round((this.hits / total) * 100) / 100 : 0,
    };
  }
}

export const menuCache = new ReadThroughCache({ ttlMs: 60 * 1000 });

export default { ReadThroughCache, menuCache };
