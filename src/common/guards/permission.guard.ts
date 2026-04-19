import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UserPayload } from '../types/global';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredPermissions) return true;

    const user: UserPayload = context.switchToHttp().getRequest().user;
    if (!user?.permissions) throw new ForbiddenException('Access denied');

    const hasPermission = requiredPermissions.every((permission) => user.permissions?.includes(permission));
    if (!hasPermission) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
