import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Role } from '~/modules/auth/entity/role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  password: string;

  @ManyToMany('Role', 'users', { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'id_user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'id_role', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken?: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt?: string;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt?: Date;
}
