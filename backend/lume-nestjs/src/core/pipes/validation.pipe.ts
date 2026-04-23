import { Injectable, PipeTransform, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class ValidatePipe implements PipeTransform {
  async transform(value: any, metadata: ArgumentMetadata) {
    if (!metadata.type || metadata.type === 'custom') {
      return value;
    }

    if (!metadata.metatype || typeof metadata.metatype !== 'function') {
      return value;
    }

    const object = plainToInstance(metadata.metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const messages = errors
        .map((error) => ({
          field: error.property,
          messages: Object.values(error.constraints || {}),
        }))
        .reduce((acc, curr) => ({ ...acc, [curr.field]: curr.messages }), {});

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    }

    return object;
  }
}
