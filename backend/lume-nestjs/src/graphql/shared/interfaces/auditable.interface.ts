import { InterfaceType, Field } from '@nestjs/graphql';

@InterfaceType('Auditable')
export abstract class Auditable {
  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
