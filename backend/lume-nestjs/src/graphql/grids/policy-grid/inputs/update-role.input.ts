import { InputType, Field } from '@nestjs/graphql';

@InputType('UpdateRoleInput')
export class UpdateRoleInput {
  @Field({ nullable: true })
  displayName?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  metadata?: string;
}
