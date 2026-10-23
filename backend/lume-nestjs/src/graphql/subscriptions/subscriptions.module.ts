import { Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';

// One in-process event bus shared by all subscription resolver modules.
@Module({
  providers: [{ provide: 'PubSub', useFactory: () => new PubSub() }],
  exports: ['PubSub'],
})
export class GraphQLSubscriptionsModule {}
