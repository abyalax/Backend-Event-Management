import { Permission } from '~/modules/auth/entity/permission.entity';

export const mockPermissions: Permission[] = [
  // User Management
  { id: 1, key: 'user:create', name: 'Create User', roles: [] },
  { id: 2, key: 'user:read', name: 'Read User', roles: [] },
  { id: 3, key: 'user:update', name: 'Update User', roles: [] },
  { id: 4, key: 'user:delete', name: 'Delete User', roles: [] },

  // Role Management
  { id: 5, key: 'role:create', name: 'Create Role', roles: [] },
  { id: 6, key: 'role:read', name: 'Read Role', roles: [] },
  { id: 7, key: 'role:update', name: 'Update Role', roles: [] },
  { id: 8, key: 'role:delete', name: 'Delete Role', roles: [] },
  { id: 9, key: 'role:assign-permission', name: 'Assign Permission to Role', roles: [] },
  { id: 10, key: 'role:assign-user', name: 'Assign User to Role', roles: [] },

  // Event Management
  { id: 11, key: 'event:create', name: 'Create Event', roles: [] },
  { id: 12, key: 'event:read', name: 'Read Event', roles: [] },
  { id: 13, key: 'event:update', name: 'Update Event', roles: [] },
  { id: 14, key: 'event:delete', name: 'Delete Event', roles: [] },
  { id: 15, key: 'event:publish', name: 'Publish Event', roles: [] },
  { id: 16, key: 'event:unpublish', name: 'Unpublish Event', roles: [] },

  // Ticket Management
  { id: 17, key: 'ticket:create', name: 'Create Ticket', roles: [] },
  { id: 18, key: 'ticket:read', name: 'Read Ticket', roles: [] },
  { id: 19, key: 'ticket:update', name: 'Update Ticket', roles: [] },
  { id: 20, key: 'ticket:delete', name: 'Delete Ticket', roles: [] },
  { id: 21, key: 'ticket:publish', name: 'Publish Ticket', roles: [] },
  { id: 22, key: 'ticket:unpublish', name: 'Unpublish Ticket', roles: [] },

  // Order Management
  { id: 23, key: 'order:create', name: 'Create Order', roles: [] },
  { id: 24, key: 'order:read', name: 'Read Order', roles: [] },
  { id: 25, key: 'order:update', name: 'Update Order', roles: [] },
  { id: 26, key: 'order:cancel', name: 'Cancel Order', roles: [] },
  { id: 27, key: 'order:refund', name: 'Refund Order', roles: [] },

  // Payment
  { id: 28, key: 'payment:create', name: 'Create Payment', roles: [] },
  { id: 29, key: 'payment:read', name: 'Read Payment', roles: [] },
  { id: 30, key: 'payment:verify', name: 'Verify Payment', roles: [] },
  { id: 31, key: 'payment:refund', name: 'Refund Payment', roles: [] },

  // Check-in / Attendance
  { id: 32, key: 'checkin:read', name: 'Read Check-in', roles: [] },
  { id: 33, key: 'checkin:validate', name: 'Validate Check-in', roles: [] },
  { id: 34, key: 'checkin:manual', name: 'Manual Check-in', roles: [] },

  // Notification
  { id: 35, key: 'notification:send', name: 'Send Notification', roles: [] },
  { id: 36, key: 'notification:read', name: 'Read Notification', roles: [] },

  // System (admin-only internal)
  { id: 37, key: 'permission:create', name: 'Create Permission', roles: [] },
  { id: 38, key: 'permission:read', name: 'Read Permission', roles: [] },
  { id: 39, key: 'permission:update', name: 'Update Permission', roles: [] },
  { id: 40, key: 'permission:delete', name: 'Delete Permission', roles: [] },
];