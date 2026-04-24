import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PERMISSIONS } from '~/common/constants/permissions';
import { Permissions } from '~/common/decorators/permissions.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { ParseUUIDPipe } from '~/common/pipes/parse-uuid.pipe';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserCacheService } from './user-cache.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userCacheService: UserCacheService) {}

  @Permissions(PERMISSIONS.USER.READ)
  @HttpCode(HttpStatus.OK)
  @Get('')
  async list(@Query() query: QueryUserDto): Promise<TResponse<Paginated<UserDto>>> {
    const paginatedUsers = await this.userCacheService.getList(query);

    return {
      message: 'get data user successfully',
      data: paginatedUsers,
    };
  }

  @Permissions(PERMISSIONS.USER.CREATE)
  @Post('')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userCacheService.create(createUserDto);

    return {
      message: 'user created successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.READ)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<UserDto>> {
    const user = await this.userCacheService.getById(id);

    const userDto = plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });

    // Manually set permissions for the user's roles
    if (user?.roles) {
      userDto.roles.forEach((role) => {
        const originalRole = user.roles.find((r) => r.id === role.id);
        if (originalRole?.rolePermissions) {
          role.permissions = originalRole.rolePermissions.map((rp) => rp.permission);
        }
      });
    }

    return {
      message: 'get user successfully',
      data: userDto,
    };
  }

  @Permissions(PERMISSIONS.USER.UPDATE)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userCacheService.update(id, updateUserDto);

    return {
      message: 'user updated successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.DELETE)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<boolean>> {
    const removed = await this.userCacheService.delete(id);

    return {
      message: 'user deleted successfully',
      data: removed.affected ? removed.affected > 0 : false,
    };
  }

  @Permissions(PERMISSIONS.USER.UPDATE)
  @Post(':id/roles')
  async assignRoles(@Param('id', ParseUUIDPipe) id: string, @Body() body: { roleIds: number[] }) {
    const user = await this.userCacheService.assignRoles(id, body.roleIds);

    return {
      message: 'roles assigned successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.UPDATE)
  @Delete(':id/roles/:roleId')
  async removeRole(@Param('id', ParseUUIDPipe) id: string, @Param('roleId') roleId: number): Promise<TResponse<UserDto>> {
    const user = await this.userCacheService.removeRole(id, roleId);

    return {
      message: 'role removed successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.READ)
  @Get(':id/roles')
  async getUserRoles(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<UserDto>> {
    const user = await this.userCacheService.getUserRoles(id);

    const userDto = plainToInstance(UserDto, user, {
      excludeExtraneousValues: true,
    });

    // Manually set permissions for the user's roles
    if (user?.roles) {
      userDto.roles.forEach((role) => {
        const originalRole = user.roles.find((r) => r.id === role.id);
        if (originalRole?.rolePermissions) {
          role.permissions = originalRole.rolePermissions.map((rp) => rp.permission);
        }
      });
    }

    return {
      message: 'user roles retrieved successfully',
      data: userDto,
    };
  }
}
