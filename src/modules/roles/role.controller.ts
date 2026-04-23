import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PERMISSIONS } from '~/common/constants/permissions';
import { Permissions } from '~/common/decorators/permissions.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateRoleDto } from './dto/create-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleCacheService } from './role-cache.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('roles')
export class RoleController {
  constructor(private readonly roleCacheService: RoleCacheService) {}

  @Permissions(PERMISSIONS.ROLE.READ)
  @HttpCode(HttpStatus.OK)
  @Get('')
  async list(@Query() query: QueryRoleDto): Promise<TResponse<Paginated<RoleDto>>> {
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
  async create(@Body() createRoleDtoCreateRoleDto: CreateRoleDto) {
    const role = await this.roleCacheService.create(createRoleDtoCreateRoleDto);

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
  async update(@Param('id') id: number, @Body() UpdateRoleDto: UpdateRoleDto) {
    const role = await this.roleCacheService.update(id, UpdateRoleDto);

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
    const removed = await this.roleCacheService.delete(id);

    return {
      message: 'role deleted successfully',
      data: removed.affected ? removed.affected > 0 : false,
    };
  }
}
