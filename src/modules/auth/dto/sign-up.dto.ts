import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

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
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @Matches(/[a-z]/, { message: 'Password harus mengandung huruf kecil' })
  @Matches(/[A-Z]/, { message: 'Password harus mengandung huruf kapital' })
  @Matches(/\d/, { message: 'Password harus mengandung angka' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password harus mengandung simbol' })
  password: string;
}
