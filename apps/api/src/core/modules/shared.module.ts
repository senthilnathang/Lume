import { Module } from '@nestjs/common';
import { BaseModule } from './base.module';

/**
 * SharedModule re-exports from BaseModule for convenience
 * Use this in feature modules via imports: [SharedModule]
 */
@Module({
  imports: [BaseModule],
  exports: [BaseModule],
})
export class SharedModule {}
