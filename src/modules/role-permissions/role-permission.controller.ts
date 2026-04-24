import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PERMISSIONS } from '~/common/constants/permissions';
import { Permissions } from '~/common/decorators/permissions.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateRoleDto } from './dto/create-role-permission.dto';
import { QueryRolePermissionDto } from './dto/query-role-permission.dto';
import { RoleDto } from './dto/role-permission.dto';
import { UpdateRoleDto } from './dto/update-role-permission.dto';
import { RoleCacheService } from './role-permission-cache.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleCacheService: RoleCacheService) {}

  @Permissions(PERMISSIONS.ROLE.READ)
  @HttpCode(HttpStatus.OK)
  @Get('')
  async list(@Query() query: QueryRolePermissionDto): Promise<TResponse<Paginated<RoleDto>>> {
    const paginatedRoles = await this.roleCacheService.getList(query);

    return {
      message: 'get roles successfully',
      data: {
        meta: paginatedRoles.meta,
        links: paginatedRoles.links,
        data: paginatedRoles.data,
      },
    };
  }

  @Permissions(PERMISSIONS.ROLE.CREATE)
  @Post('')
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.roleCacheService.create(createRoleDto);

    return {
      message: 'role created successfully',
      data: plainToInstance(RoleDto, role, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.ROLE.READ)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id') id: number): Promise<TResponse<RoleDto>> {
    const role = await this.roleCacheService.getById(id);

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      message: 'get role successfully',
      data: role,
    };
  }

  @Permissions(PERMISSIONS.ROLE.UPDATE)
  @Patch(':id')
  async update(@Param('id') id: number, @Body() updateRoleDto: UpdateRoleDto) {
    const role = await this.roleCacheService.update(id, updateRoleDto);

    return {
      message: 'role updated successfully',
      data: plainToInstance(RoleDto, role, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.ROLE.DELETE)
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<TResponse<boolean>> {
    await this.roleCacheService.delete(id);

    return {
      message: 'role deleted successfully',
      data: true,
    };
  }

  @Permissions(PERMISSIONS.ROLE.UPDATE)
  @Post(':id/permissions')
  async assignPermissions(@Param('id') id: number, @Body() body: { permissionIds: number[] }) {
    const role = await this.roleCacheService.assignPermissions(id, body.permissionIds);

    return {
      message: 'permissions assigned successfully',
      data: plainToInstance(RoleDto, role, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.ROLE.UPDATE)
  @Delete(':id/permissions/:permissionId')
  async removePermission(@Param('id') id: number, @Param('permissionId') permissionId: number): Promise<TResponse<RoleDto>> {
    const role = await this.roleCacheService.removePermission(id, permissionId);

    return {
      message: 'permission removed successfully',
      data: plainToInstance(RoleDto, role, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.ROLE.READ)
  @Get(':id/permissions')
  async getRolePermissions(@Param('id') id: number): Promise<TResponse<RoleDto>> {
    const role = await this.roleCacheService.getRolePermissions(id);

    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    return {
      message: 'role permissions retrieved successfully',
      data: plainToInstance(RoleDto, role, {
        excludeExtraneousValues: true,
      }),
    };
  }
}
