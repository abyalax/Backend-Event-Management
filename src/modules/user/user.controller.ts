import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PERMISSIONS } from '~/common/constants/permissions';
import { Permissions } from '~/common/decorators/permissions.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { UserService } from './user.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Permissions(PERMISSIONS.USER.READ, PERMISSIONS.USER.CREATE) // example guard
  @HttpCode(HttpStatus.OK)
  @Get('')
  async get(@Query() query: QueryUserDto): Promise<TResponse<Paginated<UserDto>>> {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const paginatedUsers = await this.userService.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
    });
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

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    console.log({ createUserDto });
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOneBy({ id });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<TResponse<boolean>> {
    const removed = await this.userService.remove(id);
    return {
      message: 'delete data user successfully',
      data: removed.affected ? removed.affected > 0 : false,
    };
  }
}
