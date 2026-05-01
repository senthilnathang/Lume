import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('ImportResult')
export class ImportResultType {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  imported: number;

  @Field(() => Int)
  failed: number;

  @Field(() => [String])
  errors: string[];

  @Field(() => Int)
  duration: number;
}
