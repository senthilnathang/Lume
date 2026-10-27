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
  private subscriptions = new Map<string, Map<EventHandler, EventHandler[]>>();

  constructor(private eventEmitter: EventEmitter2) {}

  emit<T = any>(event: LumeEvent<T>): void {
    this.eventEmitter.emit(event.type, event);
  }

  on<T = any>(eventType: string, handler: EventHandler<T>): void {
    this.subscribe(eventType, handler, false);
  }

  once<T = any>(eventType: string, handler: EventHandler<T>): void {
    this.subscribe(eventType, handler, true);
  }

  private subscribe(eventType: string, handler: EventHandler, once: boolean): void {
    const wrapped: EventHandler = event => {
      if (once) this.forget(eventType, handler, wrapped);
      try {
        Promise.resolve(handler(event)).catch(err => {
          console.error(`Error in event handler for ${eventType}:`, err);
        });
      } catch (err) {
        console.error(`Error in event handler for ${eventType}:`, err);
      }
    };
    let handlers = this.subscriptions.get(eventType);
    if (!handlers) this.subscriptions.set(eventType, handlers = new Map());
    handlers.set(handler, [...(handlers.get(handler) ?? []), wrapped]);
    if (once) this.eventEmitter.once(eventType, wrapped);
    else this.eventEmitter.on(eventType, wrapped);
  }

  private forget(eventType: string, handler: EventHandler, wrapped: EventHandler): void {
    const handlers = this.subscriptions.get(eventType);
    const remaining = handlers?.get(handler)?.filter(listener => listener !== wrapped) ?? [];
    if (remaining.length) handlers.set(handler, remaining);
    else handlers?.delete(handler);
    if (!handlers?.size) this.subscriptions.delete(eventType);
  }

  removeListener(eventType: string, handler: EventHandler): void {
    const listeners = this.subscriptions.get(eventType)?.get(handler);
    const wrapped = listeners?.[listeners.length - 1];
    if (!wrapped) return;
    this.eventEmitter.removeListener(eventType, wrapped);
    this.forget(eventType, handler, wrapped);
  }

  removeAllListeners(eventType?: string): void {
    if (eventType !== undefined) {
      this.eventEmitter.removeAllListeners(eventType);
      this.subscriptions.delete(eventType);
    } else {
      this.eventEmitter.removeAllListeners();
      this.subscriptions.clear();
    }
  }

  listenerCount(eventType: string): number {
    return this.eventEmitter.listenerCount(eventType);
  }
}
