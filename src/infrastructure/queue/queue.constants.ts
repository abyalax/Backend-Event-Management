export const QUEUE_DEFAULTS = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY: 2000,
  TIMEOUT: 30000,
  REMOVE_ON_COMPLETE: true,
  REMOVE_ON_FAIL: false,
  STALLED_INTERVAL: 30000,
  MAX_STALLED_COUNT: 1,
  HEALTH_CHECK_INTERVAL: 30000,
  HEALTH_CHECK_TIMEOUT: 5000,
} as const;

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  EVENT_PROCESSING: 'event-processing',
  TICKET_PROCESSING: 'ticket-processing',
  REPORT_GENERATION: 'report-generation',
  CLEANUP: 'cleanup',
} as const;

export const QUEUE_JOB_NAMES = {
  SEND_EMAIL: 'send-email',
  SEND_NOTIFICATION: 'send-notification',
  PROCESS_EVENT: 'process-event',
  PROCESS_TICKET: 'process-ticket',
  GENERATE_REPORT: 'generate-report',
  CLEANUP_EXPIRED: 'cleanup-expired',
  CLEANUP_ORPHANED: 'cleanup-orphaned',
} as const;

export const QUEUE_PREFIXES = {
  BULL: 'bull',
  BULLMQ: 'bullmq',
} as const;

export const QUEUE_EVENTS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  PROGRESS: 'progress',
  STALLED: 'stalled',
  ERROR: 'error',
} as const;

export const QUEUE_STATUS_MESSAGES = {
  ACTIVE: 'Queue is active and processing jobs',
  PAUSED: 'Queue is paused',
  DRAINING: 'Queue is draining (no new jobs accepted)',
  CLOSED: 'Queue is closed',
  ERROR: 'Queue encountered an error',
} as const;
