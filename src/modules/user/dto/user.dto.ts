import { Exclude, Expose, Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';
import { RoleDto } from '~/modules/auth/dto/role/get-role.dto';

@Exclude()
export class UserDto {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  id: number;

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

  @Expose()
  @IsArray()
  permissions: string[];

  @Exclude()
  @IsString()
  @IsOptional()
  createdAt?: string;

  @Exclude()
  @IsString()
  @IsOptional()
  updatedAt?: string;
}
