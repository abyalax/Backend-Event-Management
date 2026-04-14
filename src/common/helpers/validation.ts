import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { ZodError, ZodSchema } from 'zod';
import { ClassValidatorFail, ZodValidationFail } from '../filters/exception';

export async function validateDto<T extends object>(dtoClass: new () => T, data: T): Promise<T> {
  if (data === undefined) throw new ClassValidatorFail([{ constraints: { messages: 'Data is Undefined' }, property: 'data' }]);
  if (data === null) throw new ClassValidatorFail([{ constraints: { messages: 'Data is Null' }, property: 'data' }]);
  const instance = plainToClass(dtoClass, data, { enableImplicitConversion: true, excludeExtraneousValues: true });
  const errors = await validate(instance, {
    enableDebugMessages: true,
  });
  if (errors.length > 0) throw new ClassValidatorFail(errors);
  return instance;
}

export function validateSchema<T>(schema: ZodSchema<T>, data: T): T {
  try {
    return schema.parse(data);
  } catch (error) {
    throw new ZodValidationFail(error as ZodError);
  }
}
