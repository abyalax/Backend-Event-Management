import { User } from '~/modules/users/entity/user.entity';

export interface UserPayload extends Omit<User, 'roles' | 'password'> {
  permissions: string[];
}

declare module 'express' {
  interface Request {
    user?: UserPayload;
  }
}
