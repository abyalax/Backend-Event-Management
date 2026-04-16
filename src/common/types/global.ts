import { Permission } from '~/modules/auth/entity/permission.entity';
import { User } from '~/modules/user/entity/user.entity';

interface UserPayload extends User {
  sub: number;
  permissions: Permission[];
}

declare module 'express' {
  interface Request {
    user?: UserPayload;
  }
}
