import { InputType, Field } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class UpdateModuleConfigInput {
  @Field(() => String)
  moduleName: string;

  @Field(() => GraphQLJSON)
  config: Record<string, unknown>;
}
