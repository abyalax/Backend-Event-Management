import * as bcrypt from "bcryptjs";
import type { User } from "~/modules/users/entity/user.entity";

export const mockUser = async (): Promise<User[]> => {
  const plaintextPassword = "password";
  const passwordHashed = await bcrypt.hash(plaintextPassword, 10);

  const admin: User = {
    id: "550e8400-e29b-41d4-a716-446655440000",
    name: "Alex Admin",
    email: "admin@gmail.com",
    password: passwordHashed,
    roles: [],
  };
  const user: User = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Devina Cust",
    email: "customer@gmail.com",
    password: passwordHashed,
    roles: [],
  };

  return [admin, user];
};

