import type { Role } from "~/modules/auth/entity/role.entity";

export const mockRoles: Role[] = [
  { id: 1, name: "Admin", users: [], permissions: [] },
  { id: 2, name: "User", users: [], permissions: [] },
];
