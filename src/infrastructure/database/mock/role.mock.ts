import type { Role } from "~/modules/role-permissions/entity/role.entity";

export const mockRoles: Role[] = [
  { id: 1, name: "Admin", users: [], rolePermissions: [] },
  { id: 2, name: "User", users: [], rolePermissions: [] },
];
