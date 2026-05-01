import { ObjectType, Field, Int } from '@nestjs/graphql';
import { Node, Auditable } from '../../shared/interfaces/index.js';

@ObjectType('Media', { implements: [Node, Auditable] })
export class MediaType implements Node, Auditable {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  filename: string;

  @Field(() => String)
  mimeType: string;

  @Field(() => Int)
  size: number;

  @Field(() => String)
  url: string;

  @Field(() => String, { nullable: true })
  altText?: string;

  @Field(() => String, { nullable: true })
  caption?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Date, { nullable: true })
  deletedAt?: Date;
}
