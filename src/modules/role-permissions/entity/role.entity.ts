import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { User } from '~/modules/users/entity/user.entity';
import type { RolePermission } from './role-permissions.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'id_role' })
  id: number;

  @Column({ name: 'name', length: 50 })
  name: string;

  @ManyToMany('User', 'roles')
  users: User[];

  @OneToMany('RolePermission', 'role', { eager: true })
  rolePermissions: RolePermission[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
