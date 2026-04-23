import { Permission } from '~/modules/auth/entity/permission.entity';

export const mockPermissions: Permission[] = [
  // User Management
  { id: 1, key: 'user:create', name: 'Create User', rolePermissions: [] },
  { id: 2, key: 'user:read', name: 'Read User', rolePermissions: [] },
  { id: 3, key: 'user:update', name: 'Update User', rolePermissions: [] },
  { id: 4, key: 'user:delete', name: 'Delete User', rolePermissions: [] },

  // Role Management
  { id: 5, key: 'role:create', name: 'Create Role', rolePermissions: [] },
  { id: 6, key: 'role:read', name: 'Read Role', rolePermissions: [] },
  { id: 7, key: 'role:update', name: 'Update Role', rolePermissions: [] },
  { id: 8, key: 'role:delete', name: 'Delete Role', rolePermissions: [] },
  { id: 9, key: 'role:assign-permission', name: 'Assign Permission to Role', rolePermissions: [] },
  { id: 10, key: 'role:assign-user', name: 'Assign User to Role', rolePermissions: [] },

  // Event Management
  { id: 11, key: 'event:create', name: 'Create Event', rolePermissions: [] },
  { id: 12, key: 'event:read', name: 'Read Event', rolePermissions: [] },
  { id: 13, key: 'event:update', name: 'Update Event', rolePermissions: [] },
  { id: 14, key: 'event:delete', name: 'Delete Event', rolePermissions: [] },
  { id: 15, key: 'event:publish', name: 'Publish Event', rolePermissions: [] },
  { id: 16, key: 'event:unpublish', name: 'Unpublish Event', rolePermissions: [] },

  // Ticket Management
  { id: 17, key: 'ticket:create', name: 'Create Ticket', rolePermissions: [] },
  { id: 18, key: 'ticket:read', name: 'Read Ticket', rolePermissions: [] },
  { id: 19, key: 'ticket:update', name: 'Update Ticket', rolePermissions: [] },
  { id: 20, key: 'ticket:delete', name: 'Delete Ticket', rolePermissions: [] },
  { id: 21, key: 'ticket:publish', name: 'Publish Ticket', rolePermissions: [] },
  { id: 22, key: 'ticket:unpublish', name: 'Unpublish Ticket', rolePermissions: [] },

  // Order Management
  { id: 23, key: 'order:create', name: 'Create Order', rolePermissions: [] },
  { id: 24, key: 'order:read', name: 'Read Order', rolePermissions: [] },
  { id: 25, key: 'order:update', name: 'Update Order', rolePermissions: [] },
  { id: 26, key: 'order:cancel', name: 'Cancel Order', rolePermissions: [] },
  { id: 27, key: 'order:refund', name: 'Refund Order', rolePermissions: [] },

  // Payment
  { id: 28, key: 'payment:create', name: 'Create Payment', rolePermissions: [] },
  { id: 29, key: 'payment:read', name: 'Read Payment', rolePermissions: [] },
  { id: 30, key: 'payment:verify', name: 'Verify Payment', rolePermissions: [] },
  { id: 31, key: 'payment:refund', name: 'Refund Payment', rolePermissions: [] },

  // Check-in / Attendance
  { id: 32, key: 'checkin:read', name: 'Read Check-in', rolePermissions: [] },
  { id: 33, key: 'checkin:validate', name: 'Validate Check-in', rolePermissions: [] },
  { id: 34, key: 'checkin:manual', name: 'Manual Check-in', rolePermissions: [] },

  // Notification
  { id: 35, key: 'notification:send', name: 'Send Notification', rolePermissions: [] },
  { id: 36, key: 'notification:read', name: 'Read Notification', rolePermissions: [] },

  // System (admin-only internal)
  { id: 37, key: 'permission:create', name: 'Create Permission', rolePermissions: [] },
  { id: 38, key: 'permission:read', name: 'Read Permission', rolePermissions: [] },
  { id: 39, key: 'permission:update', name: 'Update Permission', rolePermissions: [] },
  { id: 40, key: 'permission:delete', name: 'Delete Permission', rolePermissions: [] },
];