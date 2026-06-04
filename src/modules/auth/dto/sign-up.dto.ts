import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

@Exclude()
export class SignUpDto {
  @Expose()
  @IsString()
  name: string;

  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  @MinLength(8, { message: 'Password minimal 8 karakter' })
  password: string;
}
