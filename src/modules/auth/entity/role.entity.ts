import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { User } from '~/modules/user/user.entity';
import type { Permission } from './permission.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ name: 'id_role' })
  id: number;

  @Column({ name: 'name_role', length: 50 })
  name: string;

  @ManyToMany('User', 'roles')
  users: User[];

  @ManyToMany('Permission', 'roles')
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'id_role', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'id_permission', referencedColumnName: 'id' },
  })
  permissions: Permission[];
}
