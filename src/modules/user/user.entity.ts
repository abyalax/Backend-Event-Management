import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Role } from '../auth/entity/role.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  password: string;

  @ManyToMany('Role', 'users')
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'id_user', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'id_role', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refreshToken?: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt?: string;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt?: string;
}
