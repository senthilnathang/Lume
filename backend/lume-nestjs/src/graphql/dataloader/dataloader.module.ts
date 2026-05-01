import { Module } from '@nestjs/common';
import { DataLoaderRegistry } from './dataloader.registry';

/**
 * Provides DataLoaderRegistry as a scoped provider.
 * DataLoaderRegistry is instantiated per-request in the GraphQL context factory.
 */
@Module({
  providers: [DataLoaderRegistry],
  exports: [DataLoaderRegistry],
})
export class DataLoaderModule {}
