import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { Role } from './role.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'key_name', type: 'varchar', length: 80, unique: true })
  key: string;

  @Column({ name: 'name_permission', type: 'varchar', length: 80, unique: true })
  name: string;

  @ManyToMany('Role', 'permissions')
  roles: Role[];
}
