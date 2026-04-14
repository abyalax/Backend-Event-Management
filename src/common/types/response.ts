import { HttpStatus } from '@nestjs/common';

export type TResponse<T = unknown> = {
  statusCode: HttpStatus;
  message?: string | string[];
  error?: unknown;
  data?: T;
};

export enum EMessage {
  TOKEN_NOT_FOUND = 'Token Not Found',
  TOKEN_INVALID = 'Token Invalid',
  TOKEN_EXPIRED = 'Token Expired',
  TOKEN_MALFORMED = 'Token Malformed',
  TOKEN_SIGNATURE_INVALID = 'Token Signature Invalid',
  TOKEN_NOT_BEFORE = 'Token Not Before',
  TOKEN_ERROR = 'Token Error',
  REFRESH_TOKEN_EXPIRED = 'Refresh Token Expired',

  DATABASE_ERROR = 'Database Error',
  DATABASE_QUERY_FAILED = 'Database Query Failed',

  ENTITY_NOT_FOUND = 'Entity Not Found',
  ENTITY_CONFLICT = 'Entity Conflict',
  ENTITY_PROPERTY_NOT_FOUND = 'Entity Property Was Not Found.',

  INTERNAL_SERVER_ERROR = 'Internal Server Error',
}
