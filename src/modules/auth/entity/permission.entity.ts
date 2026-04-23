import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { RolePermission } from '~/modules/role-permissions/entity/role-permissions.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'key', type: 'varchar', length: 80, unique: true })
  key: string;

  @Column({ name: 'name', type: 'varchar', length: 80, unique: true })
  name: string;

  @OneToMany('RolePermission', 'permission')
  rolePermissions: RolePermission[];

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
