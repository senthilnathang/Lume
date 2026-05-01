import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class UpdateRecordInput {
  @Field(() => Object) // JSON
  data: any;

  @Field(() => String, { nullable: true })
  visibility?: string;
}
