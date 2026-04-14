export const mockRolePermissions = [
  /**
   * Admin (1)
    1  => product:create
    2  => product:read
    3  => product:update
    4  => product:delete
   */
  { id_role: 1, id_permission: 1 },
  { id_role: 1, id_permission: 2 },
  { id_role: 1, id_permission: 3 },
  { id_role: 1, id_permission: 4 },

  /**
   * Kasir (2)
    1  => product:create
    2  => product:read
    3  => product:update
    4  => product:delete
   */
  { id_role: 2, id_permission: 1 },
  { id_role: 2, id_permission: 2 },
  { id_role: 2, id_permission: 3 },

  /**
   * Karyawan (3)
    1  => product:create
    2  => product:read
    3  => product:update
    4  => product:delete
   */
  { id_role: 3, id_permission: 2 },
];
