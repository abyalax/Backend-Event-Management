import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';

import { paginate, PaginateQuery } from 'nestjs-paginate';
import type { FindOneOptions, Repository } from 'typeorm';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { USER_PAGINATION_CONFIG } from './role-pagination.config';
import { Role } from './entity/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @Inject(REPOSITORY.ROLE)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.roleRepository, USER_PAGINATION_CONFIG);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find();
  }

  async create(createDto: CreateRoleDto): Promise<Role> {
    const user = this.roleRepository.create(createDto);
    return await this.roleRepository.save(user);
  }

  async findOne(params: FindOneOptions<Role>) {
    return await this.roleRepository.findOne({
      ...params,
      relations: ['permissions'],
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const roles = await this.roleRepository.preload({
      id: id,
      ...updateRoleDto,
    });

    if (!roles) throw new NotFoundException(`Role with ID ${id} not found`);
    return await this.roleRepository.save(roles);
  }

  async remove(id: number) {
    return await this.roleRepository.delete(id);
  }
}
