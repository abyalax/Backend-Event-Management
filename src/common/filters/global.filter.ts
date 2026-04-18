import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { handlers } from './handler';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): Response {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    for (const [klass, handler] of handlers.entries()) {
      if (exception instanceof klass) {
        const handleResponse = handler(exception);
        return response.status(handleResponse.statusCode).json({
          message: handleResponse.message,
          error: handleResponse.error,
        });
      }
    }
    console.log('Internal Server Error: ', exception);
    return response.status(500).json({
      message: 'Internal server error',
      error: exception instanceof Error ? (exception as HttpException).message : 'Unknown error',
    });
  }
}
