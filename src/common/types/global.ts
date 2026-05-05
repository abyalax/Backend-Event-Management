import { User } from '~/modules/users/entities/user.entity';

export interface UserPayload extends Omit<User, 'roles' | 'password'> {
  permissions: string[];
}

declare module 'express' {
  interface Request {
    user: UserPayload;
  }
}
declare module '@nestjs/common' {
  interface Request {
    user: UserPayload;
  }
}
