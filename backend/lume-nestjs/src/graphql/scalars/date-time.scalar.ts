import { Scalar, CustomScalarSymbol } from '@nestjs/graphql';
import { GraphQLScalarType, Kind } from 'graphql';

@Scalar('DateTime', () => Date)
export class DateTimeScalar implements CustomScalarSymbol {
  description = 'Date custom scalar type';

  parseValue(value: any): Date {
    return new Date(value);
  }

  serialize(value: any): string {
    return new Date(value).toISOString();
  }

  parseLiteral(ast: any): Date {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  }
}
