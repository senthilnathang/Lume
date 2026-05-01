import { Scalar, CustomScalarSymbol } from '@nestjs/graphql';
import { GraphQLScalarType, Kind } from 'graphql';

@Scalar('JSON', () => Object)
export class JSONScalar implements CustomScalarSymbol {
  description = 'JSON custom scalar type';

  parseValue(value: any): any {
    if (typeof value === 'string') {
      return JSON.parse(value);
    }
    return value;
  }

  serialize(value: any): string {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  parseLiteral(ast: any): any {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    if (ast.kind === Kind.OBJECT) {
      return ast.value;
    }
    return null;
  }
}
