import { GraphQLSubscriptionsModule } from '../../subscriptions/subscriptions.module';
import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { WorkflowResolver } from './resolvers/workflow.resolver';
import { FlowResolver } from './resolvers/flow.resolver';
import { FlowSubscriptionResolver } from './resolvers/flow-subscription.resolver';

/**
 * FlowGrid module for workflow automation and real-time event subscriptions
 * Provides queries, mutations, and subscriptions for workflow CRUD and execution
 */
@Module({
  imports: [SharedModule, GraphQLSubscriptionsModule],
  providers: [WorkflowResolver, FlowResolver, FlowSubscriptionResolver],
  exports: [WorkflowResolver, FlowResolver, FlowSubscriptionResolver],
})
export class FlowGridModule {}
