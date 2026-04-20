import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { handlers } from './handler';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost): Response {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    for (const [klass, handler] of handlers.entries()) {
      if (exception instanceof klass) {
        const handleResponse = handler(exception, this.logger);

        this.logger.warn(
          {
            statusCode: handleResponse.statusCode,
            error: handleResponse.error,
            url: request.url,
            method: request.method,
          },
          handleResponse.message as string,
        );

        return response.status(handleResponse.statusCode).json({
          message: handleResponse.message,
          error: handleResponse.error,
          path: request.url,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Default handler for unknown exceptions
    const statusCode = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception instanceof Error ? exception.message : 'Unknown error';

    this.logger.error(
      {
        error: exception,
        url: request.url,
        method: request.method,
        stack: exception instanceof Error ? exception.stack : undefined,
      },
      'Internal Server Error',
    );

    return response.status(statusCode).json({
      message: 'Internal server error',
      error: message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
