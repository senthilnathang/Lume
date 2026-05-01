import { InterfaceType, Field, ID, Directive } from '@nestjs/graphql';

@InterfaceType('Node')
@Directive('@key(fields: "id")')
export abstract class Node {
  @Field(() => ID)
  id: string | number;
}
