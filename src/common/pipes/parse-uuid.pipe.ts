import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ClassValidatorFail } from '../filters/exception';

@Injectable()
export class ParseUUIDPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new ClassValidatorFail([
        {
          constraints: { message: 'UUID is required' },
          property: metadata?.data ?? 'id',
        },
      ]);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(value)) {
      throw new ClassValidatorFail([
        {
          constraints: { message: 'Invalid UUID format' },
          property: metadata?.data ?? 'id',
        },
      ]);
    }

    return value;
  }
}
