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

      const middleware = this.middlewares[i];
      if (middleware) {
        return middleware(ctx, () => dispatch(i + 1));
      }

      return handler();
    };

    return dispatch(0);
  }

  clear(): void {
    this.middlewares = [];
  }
}
