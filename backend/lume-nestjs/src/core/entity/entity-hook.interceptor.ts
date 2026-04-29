import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EntityRegistryService } from './entity-registry.service';

@Injectable()
export class EntityHookInterceptor implements NestInterceptor {
  constructor(private entityRegistry: EntityRegistryService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      tap(async (data) => {
        // Hooks are fire-and-forget async operations
        // They don't block the response
        this.fireHooksAsync(context, data);
      }),
    );
  }

  private async fireHooksAsync(
    context: ExecutionContext,
    data: any,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const { entityName, operation } = request;

    if (!entityName) return;

    const entity = this.entityRegistry.getWithExtensions(entityName);
    if (!entity || !entity.hooks) return;

    const requestContext = {
      userId: request.user?.id,
      userRoles: request.user?.roles,
      metadata: { operation },
    };

    try {
      if (operation === 'create' && entity.hooks.afterCreate) {
        await entity.hooks.afterCreate(data, requestContext);
      } else if (operation === 'update' && entity.hooks.afterUpdate) {
        await entity.hooks.afterUpdate(data, requestContext);
      } else if (operation === 'delete' && entity.hooks.afterDelete) {
        await entity.hooks.afterDelete(data.id, requestContext);
      }
    } catch (error) {
      console.error(
        `Hook execution failed for ${entityName}.${operation}:`,
        error,
      );
    }
  }
}
