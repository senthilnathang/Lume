import { getDrizzle } from '../../../core/db/drizzle.js';
import { agentgridMemory } from '../models/index.js';
import { eq, and, gt, lt, like, isNotNull } from 'drizzle-orm';

export class MemoryService {
  _db() {
    return getDrizzle();
  }

  async remember(agentId, namespace, key, value, ttlMs = null) {
    const db = this._db();
    const now = new Date();
    const expiresAt = ttlMs ? new Date(now.getTime() + ttlMs) : null;

    const existing = await db.select()
      .from(agentgridMemory)
      .where(
        and(
          eq(agentgridMemory.agentId, Number(agentId)),
          eq(agentgridMemory.namespace, namespace),
          eq(agentgridMemory.key, key)
        )
      );

    if (existing.length > 0) {
      await db.update(agentgridMemory)
        .set({ value, expiresAt, updatedAt: now })
        .where(
          and(
            eq(agentgridMemory.agentId, Number(agentId)),
            eq(agentgridMemory.namespace, namespace),
            eq(agentgridMemory.key, key)
          )
        );
    } else {
      await db.insert(agentgridMemory).values({
        agentId: Number(agentId),
        namespace,
        key,
        value,
        expiresAt,
        createdAt: now,
        updatedAt: now
      });
    }
  }

  async recall(agentId, namespace, key) {
    const db = this._db();
    const now = new Date();

    const result = await db.select()
      .from(agentgridMemory)
      .where(
        and(
          eq(agentgridMemory.agentId, Number(agentId)),
          eq(agentgridMemory.namespace, namespace),
          eq(agentgridMemory.key, key)
        )
      );

    if (result.length === 0) return null;

    const record = result[0];
    if (record.expiresAt && record.expiresAt < now) {
      await this.forget(agentId, namespace, key);
      return null;
    }

    return record.value;
  }

  async recallAll(namespace, pattern = null) {
    const db = this._db();
    const now = new Date();

    let query = db.select()
      .from(agentgridMemory)
      .where(eq(agentgridMemory.namespace, namespace));

    if (pattern) {
      query = query.where(like(agentgridMemory.key, `%${pattern}%`));
    }

    const results = await query;

    const validResults = {};
    for (const record of results) {
      if (!record.expiresAt || record.expiresAt >= now) {
        validResults[record.key] = record.value;
      } else {
        await this.forget(record.agentId, namespace, record.key);
      }
    }

    return validResults;
  }

  async forget(agentId, namespace, key) {
    const db = this._db();

    await db.delete(agentgridMemory)
      .where(
        and(
          eq(agentgridMemory.agentId, Number(agentId)),
          eq(agentgridMemory.namespace, namespace),
          eq(agentgridMemory.key, key)
        )
      );
  }

  async clearExpired() {
    const db = this._db();
    const now = new Date();

    await db.delete(agentgridMemory)
      .where(and(
        isNotNull(agentgridMemory.expiresAt),
        lt(agentgridMemory.expiresAt, now)
      ));
  }
}
