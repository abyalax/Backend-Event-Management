import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Permission } from '~/modules/auth/entity/permission.entity';
import type { Role } from '~/modules/roles/entity/role.entity';

@Entity('role_permissions')
export class RolePermission {
  @PrimaryGeneratedColumn({ name: 'id_role_permission' })
  id: number;

  @Column({ name: 'id_role' })
  idRole: number;

  @Column({ name: 'id_permission' })
  idPermission: number;

  @ManyToOne('Role', 'rolePermissions')
  @JoinColumn({ name: 'id_role' })
  role: Role;

  @ManyToOne('Permission', 'rolePermissions', { eager: true })
  @JoinColumn({ name: 'id_permission' })
  permission: Permission;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
