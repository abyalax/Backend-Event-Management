export const PERMISSIONS = Object.freeze({
  // User Management
  USER: {
    CREATE: 'user:create',
    READ: 'user:read',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
  },

  // Role Management
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
    ASSIGN_PERMISSION: 'role:assign-permission',
    ASSIGN_USER: 'role:assign-user',
  },

  // Event Management
  EVENT: {
    CREATE: 'event:create',
    READ: 'event:read',
    UPDATE: 'event:update',
    DELETE: 'event:delete',
    PUBLISH: 'event:publish',
    UNPUBLISH: 'event:unpublish',
  },

  // Ticket Management
  TICKET: {
    CREATE: 'ticket:create',
    READ: 'ticket:read',
    UPDATE: 'ticket:update',
    DELETE: 'ticket:delete',
    PUBLISH: 'ticket:publish',
    UNPUBLISH: 'ticket:unpublish',
  },

  // Order Management
  ORDER: {
    CREATE: 'order:create',
    READ: 'order:read',
    UPDATE: 'order:update',
    CANCEL: 'order:cancel',
    REFUND: 'order:refund',
  },

  // Payment
  PAYMENT: {
    CREATE: 'payment:create',
    READ: 'payment:read',
    VERIFY: 'payment:verify',
    REFUND: 'payment:refund',
  },

  // Check-in / Attendance
  CHECKIN: {
    READ: 'checkin:read',
    VALIDATE: 'checkin:validate',
    MANUAL: 'checkin:manual',
  },

  // Notification
  NOTIFICATION: {
    SEND: 'notification:send',
    READ: 'notification:read',
  },
});
