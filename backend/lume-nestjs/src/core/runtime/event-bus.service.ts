import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface LumeEvent<T = any> {
  type: string;
  timestamp: Date;
  source: string;
  data: T;
  metadata?: Record<string, any>;
}

export type EventHandler<T = any> = (event: LumeEvent<T>) => Promise<void> | void;

export enum BuiltInEvents {
  ENTITY_CREATED = 'entity.created',
  ENTITY_UPDATED = 'entity.updated',
  ENTITY_DELETED = 'entity.deleted',
  RECORD_CREATED = 'record.created',
  RECORD_UPDATED = 'record.updated',
  RECORD_DELETED = 'record.deleted',
  MODULE_LOADED = 'module.loaded',
  MODULE_UNLOADED = 'module.unloaded',
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
  POLICY_EVALUATED = 'policy.evaluated',
}

@Injectable()
export class EventBusService {
  constructor(private eventEmitter: EventEmitter2) {}

  emit<T = any>(event: LumeEvent<T>): void {
    this.eventEmitter.emit(event.type, event);
  }

  on<T = any>(
    eventType: string,
    handler: EventHandler<T>,
  ): void {
    this.eventEmitter.on(eventType, (event: LumeEvent<T>) => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`Error in event handler for ${eventType}:`, err);
          });
        }
      } catch (err) {
        console.error(`Error in event handler for ${eventType}:`, err);
      }
    });
  }

  once<T = any>(
    eventType: string,
    handler: EventHandler<T>,
  ): void {
    this.eventEmitter.once(eventType, (event: LumeEvent<T>) => {
      try {
        const result = handler(event);
        if (result instanceof Promise) {
          result.catch(err => {
            console.error(`Error in event handler for ${eventType}:`, err);
          });
        }
      } catch (err) {
        console.error(`Error in event handler for ${eventType}:`, err);
      }
    });
  }

  removeListener(eventType: string, handler: EventHandler): void {
    this.eventEmitter.removeListener(eventType, handler as any);
  }

  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.eventEmitter.removeAllListeners(eventType);
    } else {
      this.eventEmitter.removeAllListeners();
    }
  }

  listenerCount(eventType: string): number {
    return this.eventEmitter.listenerCount(eventType);
  }
}
