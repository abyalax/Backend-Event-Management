export const mockRolePermissions = [
  /**
   * Admin (1) - System operator (full control)
    user:* (1-4)
    role:* (5-10)
    permission:* (37-40)
    event:* (11-16)
    ticket:* (17-22)
    order:* (23-27)
    payment:* (28-31)
    checkin:* (32-34)
    notification:* (35-36)
   */
  // User Management
  { id_role: 1, id_permission: 1 }, // user:create
  { id_role: 1, id_permission: 2 }, // user:read
  { id_role: 1, id_permission: 3 }, // user:update
  { id_role: 1, id_permission: 4 }, // user:delete

  // Role Management
  { id_role: 1, id_permission: 5 }, // role:create
  { id_role: 1, id_permission: 6 }, // role:read
  { id_role: 1, id_permission: 7 }, // role:update
  { id_role: 1, id_permission: 8 }, // role:delete
  { id_role: 1, id_permission: 9 }, // role:assign-permission
  { id_role: 1, id_permission: 10 }, // role:assign-user

  // Event Management
  { id_role: 1, id_permission: 11 }, // event:create
  { id_role: 1, id_permission: 12 }, // event:read
  { id_role: 1, id_permission: 13 }, // event:update
  { id_role: 1, id_permission: 14 }, // event:delete
  { id_role: 1, id_permission: 15 }, // event:publish
  { id_role: 1, id_permission: 16 }, // event:unpublish

  // Ticket Management
  { id_role: 1, id_permission: 17 }, // ticket:create
  { id_role: 1, id_permission: 18 }, // ticket:read
  { id_role: 1, id_permission: 19 }, // ticket:update
  { id_role: 1, id_permission: 20 }, // ticket:delete
  { id_role: 1, id_permission: 21 }, // ticket:publish
  { id_role: 1, id_permission: 22 }, // ticket:unpublish

  // Order Management
  { id_role: 1, id_permission: 23 }, // order:create
  { id_role: 1, id_permission: 24 }, // order:read
  { id_role: 1, id_permission: 25 }, // order:update
  { id_role: 1, id_permission: 26 }, // order:cancel
  { id_role: 1, id_permission: 27 }, // order:refund

  // Payment
  { id_role: 1, id_permission: 28 }, // payment:create
  { id_role: 1, id_permission: 29 }, // payment:read
  { id_role: 1, id_permission: 30 }, // payment:verify
  { id_role: 1, id_permission: 31 }, // payment:refund

  // Check-in / Attendance
  { id_role: 1, id_permission: 32 }, // checkin:read
  { id_role: 1, id_permission: 33 }, // checkin:validate
  { id_role: 1, id_permission: 34 }, // checkin:manual

  // Notification
  { id_role: 1, id_permission: 35 }, // notification:send
  { id_role: 1, id_permission: 36 }, // notification:read

  // System (admin-only internal)
  { id_role: 1, id_permission: 37 }, // permission:create
  { id_role: 1, id_permission: 38 }, // permission:read
  { id_role: 1, id_permission: 39 }, // permission:update
  { id_role: 1, id_permission: 40 }, // permission:delete

  /**
   * User (2) - End-user / buyer ticket
    event:read (12)
    ticket:read (18)
    order:create (23)
    order:read (24)
    order:cancel (26)
    payment:create (28)
    payment:read (29)
    notification:read (36)
   */
  { id_role: 2, id_permission: 12 }, // event:read
  { id_role: 2, id_permission: 18 }, // ticket:read
  { id_role: 2, id_permission: 23 }, // order:create
  { id_role: 2, id_permission: 24 }, // order:read
  { id_role: 2, id_permission: 26 }, // order:cancel
  { id_role: 2, id_permission: 28 }, // payment:create
  { id_role: 2, id_permission: 29 }, // payment:read
  { id_role: 2, id_permission: 36 }, // notification:read
];
