import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';
import { plainToInstance } from 'class-transformer';

import { paginate, PaginateQuery } from 'nestjs-paginate';
import type { FindOneOptions, Repository } from 'typeorm';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import { ROLE_PAGINATION_CONFIG } from './role-pagination.config';
import { Role } from './entity/role.entity';
import { RoleDto } from './dto/role.dto';

@Injectable()
export class RoleService {
  constructor(
    @Inject(REPOSITORY.ROLE)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async list(query: PaginateQuery) {
    const paginatedRoles = await paginate(query, this.roleRepository, ROLE_PAGINATION_CONFIG);

    const roles = plainToInstance(RoleDto, paginatedRoles.data, {
      excludeExtraneousValues: true,
    });

    return {
      ...paginatedRoles,
      data: roles,
    };
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
      relations: ['rolePermissions', 'rolePermissions.permission'],
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
