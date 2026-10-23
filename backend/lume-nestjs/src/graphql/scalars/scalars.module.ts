import { Module } from '@nestjs/common';
import { DateTimeScalar } from './date-time.scalar';

@Module({
  // JSON fields reference graphql-scalars' GraphQLJSON directly. Registering
  // another scalar named JSON here creates a duplicate in the complete schema.
  providers: [DateTimeScalar],
  exports: [DateTimeScalar],
})
export class ScalarsModule {}
