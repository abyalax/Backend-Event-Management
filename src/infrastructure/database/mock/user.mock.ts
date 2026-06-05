import bcrypt from "bcryptjs";
import type { User } from "~/modules/users/entities/user.entity";
import { faker } from '@faker-js/faker';
import { ADMIN, ADMIN_ID } from "../const/shared-data";

export const mockUser = async () => {
  const plaintextPassword = ADMIN.password;
  const passwordHashed = await bcrypt.hash(plaintextPassword, 10);
  
  const users: User[] = [];
  const userRoles: { id_user: string; id_role: number }[] = [];

  users.push({
    id: ADMIN_ID,
    name: ADMIN.name,
    email: ADMIN.email,
    password: passwordHashed,
    roles: [],
  });
  userRoles.push({ id_user: ADMIN_ID, id_role: 1 });

  for (let i = 0; i < 350; i++) {
    const userId = faker.string.uuid();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    users.push({
      id: userId,
      name: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      password: passwordHashed,
      roles: [],
    });

    userRoles.push({
      id_user: userId,
      id_role: 2,
    });
  }

  return { users, userRoles };
};