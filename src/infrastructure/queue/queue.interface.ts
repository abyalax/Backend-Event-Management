export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password: string;
  };
  concurrency: number;
}
