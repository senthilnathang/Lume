import { InputType, Field } from '@nestjs/graphql';

@InputType('CreateRoleInput')
export class CreateRoleInput {
  @Field()
  name: string;

  @Field()
  displayName: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true, defaultValue: true })
  isActive?: boolean;

  @Field({ nullable: true })
  metadata?: string;
}
