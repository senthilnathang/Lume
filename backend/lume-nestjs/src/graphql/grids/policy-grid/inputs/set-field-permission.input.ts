import { InputType, Field, Int } from '@nestjs/graphql';

@InputType('SetFieldPermissionInput')
export class SetFieldPermissionInput {
  @Field(() => Int)
  fieldId: number;

  @Field(() => Int)
  roleId: number;

  @Field({ nullable: true, defaultValue: true })
  canRead?: boolean;

  @Field({ nullable: true, defaultValue: false })
  canWrite?: boolean;
}
