import { Module } from '@nestjs/common';
import { DateTimeScalar } from './date-time.scalar';
import { JSONScalar } from './json.scalar';

@Module({
  providers: [DateTimeScalar, JSONScalar],
  exports: [DateTimeScalar, JSONScalar],
})
export class ScalarsModule {}
