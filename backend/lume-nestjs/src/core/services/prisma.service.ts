import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'stdout', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Helper: Soft delete filter
  getWithoutDeleted(model: string) {
    return {
      where: {
        deleted_at: null,
      },
    };
  }

  // Helper: Convert snake_case fields to camelCase
  _toCamelCase(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this._toCamelCase(item));
    }

    if (obj !== null && obj.constructor === Object) {
      const camelCased = {};
      for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
        camelCased[camelKey] = this._toCamelCase(obj[key]);
      }
      return camelCased;
    }

    return obj;
  }
}
