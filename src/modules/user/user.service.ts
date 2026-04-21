import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';
import { Permission } from '../auth/entity/permission.entity';
import { User } from './entity/user.entity';

import { paginate, PaginateQuery } from 'nestjs-paginate';
import type { FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { USER_PAGINATION_CONFIG } from './user-pagination.config';

@Injectable()
export class UserService {
  constructor(
    @Inject(REPOSITORY.USER)
    private readonly userRepository: Repository<User>,

    @Inject(REPOSITORY.PERMISSION)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.userRepository, USER_PAGINATION_CONFIG);
  }

  async getRefreshToken(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    return user?.refreshToken;
  }

  async getFullPermissions(userId: string) {
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .distinct(true)
      .innerJoin('permission.roles', 'role')
      .innerJoin('role.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
    return permissions;
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    return await this.userRepository.update(userId, { refreshToken });
  }

  async removeRefreshToken(userId: string) {
    return await this.userRepository.update(userId, { refreshToken: null });
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findOneBy(params: FindOptionsWhere<User> | FindOptionsWhere<User>[]) {
    return await this.userRepository.findOneOrFail({
      where: params,
      relations: ['roles'],
    });
  }

  async findOne(params: FindOneOptions<User>) {
    return await this.userRepository.findOne(params);
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto,
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return await this.userRepository.save(user);
  }

  async remove(id: string) {
    return await this.userRepository.delete(id);
  }
}
