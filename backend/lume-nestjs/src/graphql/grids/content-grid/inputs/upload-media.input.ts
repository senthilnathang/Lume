import { InputType, Field, Int } from '@nestjs/graphql';

@InputType()
export class UploadMediaInput {
  @Field(() => String)
  name: string;

  @Field(() => String)
  url: string;

  @Field(() => String)
  mimeType: string;

  @Field(() => Int)
  size: number;

  @Field(() => String, { nullable: true })
  altText?: string;
}
