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
import { UserService } from './user.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly userCacheService: UserCacheService,
  ) {}

  @Permissions(PERMISSIONS.USER.READ)
  @HttpCode(HttpStatus.OK)
  @Get('')
  async list(@Query() query: QueryUserDto): Promise<TResponse<Paginated<UserDto>>> {
    const paginatedUsers = await this.userCacheService.getList(query);

    return {
      message: 'get data user successfully',
      data: {
        meta: paginatedUsers.meta,
        links: paginatedUsers.links,
        data: plainToInstance(UserDto, paginatedUsers.data, {
          excludeExtraneousValues: true,
        }),
      },
    };
  }

  @Permissions(PERMISSIONS.USER.CREATE)
  @Post('')
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    await this.userCacheService.invalidateList();

    return {
      message: 'user created successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.DELETE)
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<UserDto>> {
    const user = await this.userCacheService.getById(id);

    return {
      message: 'get user successfully',
      data: plainToInstance(UserDto, user, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.UPDATE)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto) {
    await this.userService.update(id, updateUserDto);
    await this.userCacheService.invalidateOnMutation(id);

    return {
      message: 'user updated successfully',
      data: plainToInstance(UserDto, updateUserDto, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Permissions(PERMISSIONS.USER.DELETE)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<boolean>> {
    const removed = await this.userService.remove(id);
    await this.userCacheService.invalidateOnMutation(id);

    return {
      message: 'user deleted successfully',
      data: removed.affected ? removed.affected > 0 : false,
    };
  }
}
