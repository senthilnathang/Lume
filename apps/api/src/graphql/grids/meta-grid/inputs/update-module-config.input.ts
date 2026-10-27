import { InputType, Field, Int } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { IsString, IsNotEmpty, IsObject, IsInt, Min, Max } from 'class-validator';

@InputType()
export class UpdateModuleConfigInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  moduleName: string;

  @Field(() => GraphQLJSON)
  @IsObject()
  config: Record<string, unknown>;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedRevision: number;
}
