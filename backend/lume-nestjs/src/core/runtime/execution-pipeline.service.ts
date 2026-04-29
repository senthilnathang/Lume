import { Injectable } from '@nestjs/common';

export interface ExecutionContext {
  entityName: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'list';
  data?: any;
  recordId?: number;
  user?: any;
  metadata?: Record<string, any>;
}

export type PipelineMiddleware = (
  ctx: ExecutionContext,
  next: () => Promise<any>,
) => Promise<any>;

@Injectable()
export class ExecutionPipelineService {
  private middlewares: PipelineMiddleware[] = [];

  use(middleware: PipelineMiddleware): void {
    this.middlewares.push(middleware);
  }

  async execute<T = any>(
    ctx: ExecutionContext,
    handler: () => Promise<T>,
  ): Promise<T> {
    let index = -1;

    const dispatch = async (i: number): Promise<any> => {
      if (i <= index) {
        throw new Error('next() called multiple times');
      }
      index = i;

      let fn: (() => Promise<any>) | undefined;

      if (i < this.middlewares.length) {
        fn = this.middlewares[i];
      } else {
        fn = handler;
      }

      if (!fn) return;

      try {
        return await fn(ctx, () => dispatch(i + 1));
      } catch (err) {
        throw err;
      }
    };

    return dispatch(0);
  }

  clear(): void {
    this.middlewares = [];
  }
}
