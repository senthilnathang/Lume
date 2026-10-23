import { Scalar, CustomScalar } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { ValueNode } from 'graphql';

@Scalar('JSON', () => Object)
export class JSONScalar implements CustomScalar<unknown, unknown> {
  description = 'JSON custom scalar type';

  parseValue(value: unknown): unknown {
    return GraphQLJSON.parseValue(value);
  }

  serialize(value: unknown): unknown {
    return GraphQLJSON.serialize(value);
  }

  parseLiteral(ast: ValueNode, variables?: Record<string, unknown>): unknown {
    return GraphQLJSON.parseLiteral(ast, variables);
  }
}
