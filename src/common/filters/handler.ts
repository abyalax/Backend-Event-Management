import { HttpException, HttpStatus } from '@nestjs/common';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { EntityNotFoundError, EntityPropertyNotFoundError, QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { EMessage } from '../types/response';
import { ClassValidatorFail } from './exception';

type ErrorConstructor<T extends Error = Error> = new (...args: unknown[]) => T;
type ExceptionHandler<T = unknown> = (
  e: T,
  logger: PinoLogger,
) => {
  statusCode: number;
  message: unknown;
  error: unknown;
};

export const handlers = new Map<ErrorConstructor, ExceptionHandler>([
  [
    NotBeforeError,
    (e: NotBeforeError, logger: PinoLogger) => {
      logger.warn({ error: e.message }, 'NotBeforeError');
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_NOT_BEFORE,
        error: e.message,
      };
    },
  ],
  [
    TokenExpiredError,
    (e: TokenExpiredError, logger: PinoLogger) => {
      logger.warn({ error: e.message }, 'TokenExpiredError');
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_EXPIRED,
        error: e.message,
      };
    },
  ],
  [
    JsonWebTokenError,
    (e: JsonWebTokenError, logger: PinoLogger) => {
      logger.warn({ error: e.message }, 'JsonWebTokenError');
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_ERROR,
        error: e.message,
      };
    },
  ],
  [
    QueryFailedError,
    (e: QueryFailedError, logger: PinoLogger) => {
      logger.error({ error: e.message }, 'QueryFailedError');
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: EMessage.DATABASE_QUERY_FAILED,
        error: e.message,
      };
    },
  ],
  [
    ClassValidatorFail,
    (e: ClassValidatorFail, logger: PinoLogger) => {
      logger.warn({ details: e.details }, 'ClassValidatorFail');
      const details = e.details as Array<{ message: string }>;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: details?.[0]?.message ?? EMessage.VALIDATION_FAIL,
        error: details,
      };
    },
  ],
  [
    EntityNotFoundError,
    (e: EntityNotFoundError, logger: PinoLogger) => {
      logger.warn({ error: e.message }, 'EntityNotFoundError');
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: EMessage.ENTITY_NOT_FOUND,
        error: e.message,
      };
    },
  ],
  [
    EntityPropertyNotFoundError,
    (e: EntityPropertyNotFoundError, logger: PinoLogger) => {
      logger.warn({ error: e.message }, 'EntityPropertyNotFoundError');
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: EMessage.ENTITY_PROPERTY_NOT_FOUND,
        error: e.message,
      };
    },
  ],
  [
    ZodError,
    (e: ZodError, logger: PinoLogger) => {
      logger.warn({ issues: e.issues }, 'ZodError');
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: e.issues.map((i) => i.message),
        error: e.errors,
      };
    },
  ],
  [
    HttpException,
    (e: HttpException, logger: PinoLogger) => {
      logger.warn({ response: e.getResponse() }, 'HttpException');
      const response = e.getResponse();
      return {
        statusCode: e.getStatus(),
        message: (response as Error).message,
        error: e.message,
      };
    },
  ],
]);
