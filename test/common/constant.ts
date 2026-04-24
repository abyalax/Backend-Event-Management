export const USER = {
  LOGIN: {
    email: 'admin@gmail.com',
    password: 'password',
  },
};

export const env = {
  PORT: process.env.PORT,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
  JWT_EXPIRATION: process.env.JWT_EXPIRATION,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,

  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_TYPE: process.env.DATABASE_T,

  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  COOKIE_SECRET: process.env.COOKIE_SEC,

  // Mailpit Configuration
  MAILPIT_HOST: process.env.MAILPIT_HOST,
  MAILPIT_PORT: process.env.MAILPIT_PORT,
  MAILPIT_SECURE: process.env.MAILPIT_SECURE,
  MAILPIT_USER: process.env.MAILPIT_USER,
  MAILPIT_PASSWORD: process.env.MAILPIT_PASSWORD,
  MAILPIT_FROM_EMAIL: process.env.MAILPIT_FROM_EMAIL,
  MAILPIT_FROM_NAME: process.env.MAILPIT_FROM_N,

  // MinIO Configuration
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
  MINIO_PORT: process.env.MINIO_PORT,
  MINIO_USE_SSL: process.env.MINIO_USE_SSL,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
  MINIO_REGION: process.env.MINIO_REG,

  // Storage Bucket Configuration
  STORAGE_BUCKET_DOCUMENTS: process.env.STORAGE_BUCKET_DOCUMENTS,
  STORAGE_BUCKET_IMAGES: process.env.STORAGE_BUCKET_IMAGES,
  STORAGE_BUCKET_BACKUPS: process.env.STORAGE_BUCKET_BACKUPS,
  STORAGE_BUCKET_VIDEOS: process.env.STORAGE_BUCKET_VID,

  // File Constraints
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES: process.env.ALLOWED_MIME_TY,

  // Retry Strategy Configuration
  RETRY_MAX_ATTEMPTS: process.env.RETRY_MAX_ATTEMPTS,
  RETRY_INITIAL_DELAY_MS: process.env.RETRY_INITIAL_DELAY_MS,
  RETRY_MAX_DELAY_MS: process.env.RETRY_MAX_DELAY,

  // Monitoring Configuration
  ENABLE_STORAGE_METRICS: process.env.ENABLE_STORAGE_METRICS,
  STORAGE_HEALTH_CHECK_INTERVAL: process.env.STORAGE_HEALTH_CHECK_INTER,

  // Queue Configuration
  QUEUE_CONCURRENCY: process.env.QUEUE_CONCURRENCY,
};
