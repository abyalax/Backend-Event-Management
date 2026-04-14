import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

@Exclude()
export class SignInDto {
  @Expose()
  @IsEmail()
  email: string;

  @Expose()
  @IsString()
  password: string;
}
