import { InputType, Field, Int } from '@nestjs/graphql';

@InputType('AssignPermissionInput')
export class AssignPermissionInput {
  @Field(() => Int)
  roleId: number;

  @Field(() => Int)
  permissionId: number;

  @Field({ nullable: true, defaultValue: 'read' })
  action?: string;
}
