import type { Role } from "~/modules/roles/entity/role.entity";

export const mockRoles: Role[] = [
  { id: 1, name: "Admin", users: [], permissions: [] },
  { id: 2, name: "User", users: [], permissions: [] },
];
