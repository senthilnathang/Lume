import { tenantEventAllowed } from '../../../tenant';
import {
  Resolver,
  Subscription,
  Context,
} from '@nestjs/graphql';
import { UseGuards, Inject } from '@nestjs/common';
import { GqlJwtGuard } from '../../../guards/gql-jwt.guard';
import { PubSub } from 'graphql-subscriptions';
import { FlowEventType } from '../types/flow-event.type';
import type { GqlContext, JwtPayload } from '../../../graphql.context';

const FLOW_EXECUTED_EVENT = 'flowExecuted';

/**
 * FlowGrid Subscription Resolver
 * Real-time subscription for workflow execution events via WebSocket
 * Bridges EventBusService → PubSub → GraphQL subscriptions
 */
@Resolver()
@UseGuards(GqlJwtGuard)
export class FlowSubscriptionResolver {
  constructor(@Inject('PubSub') private pubSub: PubSub) {}

  @Subscription(() => FlowEventType, {
    name: 'flowExecuted',
    filter: (
      payload: { flowExecuted: FlowEventType },
      _,
      ctx: GqlContext,
    ) => {
      // Multi-tenant isolation: only emit events for subscriber's company
      return tenantEventAllowed(ctx, payload.flowExecuted?.companyId);
    },
  })
  flowExecuted(): AsyncIterator<any> {
    // TODO: Subscribe to EventBusService.on(BuiltInEvents.WORKFLOW_COMPLETED)
    // - Publish flowExecuted event with { flowExecuted: { ...event.data, status: 'completed' } }
    // - Publish flowFailed event with { flowFailed: { ...event.data, status: 'failed', errorMessage } }
    return this.pubSub.asyncIterableIterator([FLOW_EXECUTED_EVENT]);
  }

  @Subscription(() => FlowEventType, {
    name: 'flowFailed',
    filter: (payload: { flowFailed: FlowEventType }, _, ctx: GqlContext) => {
      return tenantEventAllowed(ctx, payload.flowFailed?.companyId);
    },
  })
  flowFailed(): AsyncIterator<any> {
    // TODO: Subscribe to EventBusService.on(BuiltInEvents.WORKFLOW_FAILED)
    // - Publish flowFailed event with execution error context
    return this.pubSub.asyncIterableIterator(['flowFailed']);
  }

  @Subscription(() => FlowEventType, {
    name: 'flowProgress',
    filter: (
      payload: { flowProgress: FlowEventType },
      _,
      ctx: GqlContext,
    ) => {
      return tenantEventAllowed(ctx, payload.flowProgress?.companyId);
    },
  })
  flowProgress(): AsyncIterator<any> {
    // TODO: Subscribe to EventBusService.on(BuiltInEvents.WORKFLOW_STEP_COMPLETED)
    // - Publish flowProgress event with current step info, status, executionTimeMs
    return this.pubSub.asyncIterableIterator(['flowProgress']);
  }
}
