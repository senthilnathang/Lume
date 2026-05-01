import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class InstallPluginInput {
  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  version?: string;
}
