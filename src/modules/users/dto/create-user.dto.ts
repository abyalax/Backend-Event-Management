import { Exclude, Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

@Exclude()
export class CreateUserDto {
  @Expose()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;

  @Expose()
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @Expose()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @Matches(/[a-z]/, { message: 'Password harus mengandung huruf kecil' })
  @Matches(/[A-Z]/, { message: 'Password harus mengandung huruf kapital' })
  @Matches(/\d/, { message: 'Password harus mengandung angka' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password harus mengandung simbol' })
  password: string;
}
