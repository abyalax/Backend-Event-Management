import * as bcrypt from 'bcryptjs';
import { User } from '~/modules/user/user.entity';

export const mockUser = async (): Promise<User[]> => {
  const plaintextPassword = 'password';
  const passwordHashed = await bcrypt.hash(plaintextPassword, 10);

  const admin: User = { id: 1, name: 'John Admin', email: 'johnadmin@gmail.com', password: passwordHashed, roles: [] };
  const kasir: User = { id: 2, name: 'John Kasir', email: 'johnkasir@gmail.com', password: passwordHashed, roles: [] };
  const karyawan: User = { id: 3, name: 'John Karyawan', email: 'johnkaryawan@gmail.com', password: passwordHashed, roles: [] };

  return [admin, kasir, karyawan];
};
