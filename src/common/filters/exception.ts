import { ValidationError } from 'class-validator';
import { ZodError } from 'zod';

export class ValidationFail extends Error {
  public details: unknown;

  constructor(errors: unknown[], message: string = 'Validation failed') {
    super(message);
    const errorDetails = Array.isArray(errors) ? errors : [errors];
    this.details = errorDetails;
    this.name = '';
    this.message = '\n' + this.constructor.name + '\n' + errorDetails.map((error) => `${JSON.stringify(error).replace(/"/g, ' ')}`).join('\n') + '\n';
    this.stack = undefined;
  }
}

export class ZodValidationFail extends ValidationFail {
  constructor(zodError: ZodError, message: string = 'Zod validation failed') {
    const formatted = zodError.errors?.map((error) => ({
      [error.code]: `${error.path?.join('.')} ${error.message}`.trim(),
    })) || [{ zodError: zodError.message }];

    super(formatted, message);
  }
}

export class ClassValidatorFail extends ValidationFail {
  constructor(errors: ValidationError[], message: string = 'Class validation failed') {
    const formatted = errors.map((error) => {
      const constraints = error.constraints ?? {};
      return Object.keys(constraints).reduce(
        (acc, key) => {
          acc[key] = constraints[key];
          return acc;
        },
        {} as Record<string, string>,
      );
    });
    super(formatted, message);
  }
}
