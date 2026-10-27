import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType('TenantMembership')
export class TenantMembershipType {
  @Field(() => Int)
  userId: number;

  @Field(() => Int, { nullable: true })
  companyId: number | null;

  @Field(() => Boolean)
  managed: boolean;
}
