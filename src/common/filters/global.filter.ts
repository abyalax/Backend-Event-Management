import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
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
        return response.status(handleResponse.statusCode).json(handleResponse);
      }
    }
    console.log('Internal Server Error: ', exception);
    return response.status(500).json({
      statusCode: 500,
      message: 'Internal server error',
      error: exception instanceof Error ? (exception as HttpException).message : 'Unknown error',
    });
  }
}
