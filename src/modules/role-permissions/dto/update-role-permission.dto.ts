import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role-permission.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
