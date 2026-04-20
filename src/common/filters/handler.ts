import { HttpException, HttpStatus } from '@nestjs/common';
import { JsonWebTokenError, NotBeforeError, TokenExpiredError } from '@nestjs/jwt';
import { EntityNotFoundError, EntityPropertyNotFoundError, QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { EMessage } from '../types/response';
import { ClassValidatorFail } from './exception';

type ErrorConstructor<T extends Error = Error> = new (...args: unknown[]) => T;
type ExceptionHandler<T = unknown> = (e: T) => {
  statusCode: number;
  message: unknown;
  error: unknown;
};

export const handlers = new Map<ErrorConstructor, ExceptionHandler>([
  [
    NotBeforeError,
    (e: NotBeforeError) => {
      console.log('NotBeforeError: ', e.message);
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_NOT_BEFORE,
        error: e.message,
      };
    },
  ],
  [
    TokenExpiredError,
    (e: TokenExpiredError) => {
      console.log('TokenExpiredError: ', e.message);
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_EXPIRED,
        error: e.message,
      };
    },
  ],
  [
    JsonWebTokenError,
    (e: JsonWebTokenError) => {
      console.log('JsonWebTokenError: ', e.message);
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: EMessage.TOKEN_ERROR,
        error: e.message,
      };
    },
  ],
  [
    QueryFailedError,
    (e: QueryFailedError) => {
      console.log('QueryFailedError: ', e.message);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: EMessage.DATABASE_QUERY_FAILED,
        error: e.message,
      };
    },
  ],
  [
    ClassValidatorFail,
    (e: ClassValidatorFail) => {
      console.log('ClassValidatorFail: ', e);
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
    (e: EntityNotFoundError) => {
      console.log('EntityNotFoundError: ', e.message);
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: EMessage.ENTITY_NOT_FOUND,
        error: e.message,
      };
    },
  ],
  [
    EntityPropertyNotFoundError,
    (e: EntityPropertyNotFoundError) => {
      console.log('EntityPropertyNotFoundError: ', e.message);
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: EMessage.ENTITY_PROPERTY_NOT_FOUND,
        error: e.message,
      };
    },
  ],
  [
    ZodError,
    (e: ZodError) => {
      console.log('ZodError: ', e.issues);
      return {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: e.issues.map((i) => i.message),
        error: e.errors,
      };
    },
  ],
  [
    HttpException,
    (e: HttpException) => {
      console.log('HttpException: ', e.getResponse());
      const response = e.getResponse();
      return {
        statusCode: e.getStatus(),
        message: (response as Error).message,
        error: e.message,
      };
    },
  ],
]);
