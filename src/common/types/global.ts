import { User } from '~/modules/user/entity/user.entity';

export interface UserPayload extends Omit<User, 'roles' | 'password'> {
  permissions: string[];
}

declare module 'express' {
  interface Request {
    user?: UserPayload;
  }
}
