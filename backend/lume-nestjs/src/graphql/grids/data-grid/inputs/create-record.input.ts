import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class CreateRecordInput {
  @Field(() => Object) // JSON
  data: any;

  @Field(() => String, { nullable: true, defaultValue: 'private' })
  visibility?: string;
}
