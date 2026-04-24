import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { RoleDto } from '~/modules/role-permissions/dto/role-permission.dto';

@Exclude()
export class UserDto {
  @Expose()
  @IsString()
  id: string;

  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsString()
  email: string;

  @Exclude()
  @IsOptional()
  @IsString()
  password?: string;

  @Expose()
  @IsArray()
  @Type(() => RoleDto)
  roles: RoleDto[];

  @Exclude()
  @IsString()
  @IsOptional()
  createdAt?: string;

  @Exclude()
  @IsString()
  @IsOptional()
  updatedAt?: string;
}
