import { RoleDto } from '../auth/dto/role/get-role.dto';

export interface IUserPayload {
  id: number;
  sub: number;
  email: string;
  roles: RoleDto[];
  permissions: string[];
  iat?: number;
  exp?: number;
}

export interface IPermission {
  id: number;
  key: string;
  name: string;
  roles: IRole[];
}

export interface IRole {
  id: number;
  name: string;
  users: IUser[];
  permissions: IPermission[];
}

export interface IUser {
  id: number;
  name: string;
  email: string;
  password: string;
  roles: IRole[];
  refreshToken: string;
  createdAt: Date;
  updatedAt: Date;
}
