import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { AttachMediaDto } from '../dto/attach-media.dto';

@Injectable()
export class AttachMediaValidationPipe implements PipeTransform {
  async transform(value: unknown) {
    if (!value || typeof value !== 'object') throw new BadRequestException('Invalid request body');

    const dto = plainToClass(AttachMediaDto, value);

    const errors = await validate(dto);
    if (errors.length > 0) {
      const errorMessages = errors.flatMap((err) => Object.values(err.constraints || {}));
      throw new BadRequestException(errorMessages);
    }

    return dto;
  }
}
