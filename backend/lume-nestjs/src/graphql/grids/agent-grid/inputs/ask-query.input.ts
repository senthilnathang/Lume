import { InputType, Field } from '@nestjs/graphql';

@InputType('AskQueryInput')
export class AskQueryInput {
  @Field()
  question: string;

  @Field({ nullable: true })
  entityName?: string;

  @Field({ nullable: true, defaultValue: 0.1 })
  temperature?: number;
}
