import { Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as Minio from 'minio';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

export interface MinioConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
  buckets: {
    documents: string;
    images: string;
    backups: string;
    videos: string;
  };
}

/**
 * MinIO Provider - Handles connection pooling dan lifecycle management
 *
 * Responsibilities:
 * - Create dan maintain MinIO client instance
 * - Initialize required buckets
 * - Provide access ke client untuk operations
 * - Health monitoring
 *
 * Lifecycle:
 * 1. onModuleInit() - Create client & buckets
 * 2. Usage - Service layer calls methods
 * 3. onModuleDestroy() - Cleanup connections
 */
@Injectable()
export class MinioProvider implements OnModuleInit, OnModuleDestroy {
  private client: Minio.Client;
  private isConnected = false;
  private initializationPromise: Promise<void>;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(CONFIG_SERVICE) private readonly configEnv: ConfigService,
    @Inject(CONFIG_PROVIDER.STORAGE) private readonly configMinio: MinioConfig,
  ) {
    this.logger.setContext(MinioProvider.name);
    this.initClient();
  }

  /**
   * Initialize MinIO client dengan configuration
   */
  private initClient(): void {
    try {
      // Force SSL to false for development environment
      const useSSL = this.configMinio.useSSL && this.configEnv.get('NODE_ENV') === 'production';

      this.client = new Minio.Client({
        endPoint: this.configMinio.endpoint,
        port: this.configMinio.port,
        useSSL: useSSL,
        accessKey: this.configMinio.accessKey,
        secretKey: this.configMinio.secretKey,
        region: this.configMinio.region,
      });
      this.logger.info(`MinIO client initialized: ${this.configMinio.endpoint}:${this.configMinio.port} (SSL: ${useSSL})`);
    } catch (error) {
      this.logger.error('Failed to initialize MinIO client', error);
      throw error;
    }
  }

  /**
   * NestJS lifecycle hook - Called when module is initialized
   * Ensures all buckets exist dan client is ready
   */
  async onModuleInit(): Promise<void> {
    this.initializationPromise = this.initialize();
    await this.initializationPromise;
  }

  /**
   * Initialize connection dan create required buckets
   */
  private async initialize(): Promise<void> {
    try {
      // Test connection
      await this.testConnection();

      // Create required buckets
      const bucketNames = Object.values(this.configMinio.buckets);
      for (const bucketName of bucketNames) {
        await this.ensureBucket(bucketName);
      }

      this.isConnected = true;
      this.logger.info('MinIO initialization completed successfully');
    } catch (error) {
      this.logger.error('MinIO initialization failed', error);
      // In test environment, don't throw errors to allow tests to run
      if (this.configEnv.get('NODE_ENV') !== 'test') {
        throw error;
      }
      this.logger.warn('MinIO not available in test environment - operations will fail gracefully');
    }
  }

  /**
   * Test connection ke MinIO server
   */
  private async testConnection(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.listBuckets();
      const latency = Date.now() - startTime;
      this.logger.info(`MinIO connection test successful (latency: ${latency}ms)`);
    } catch (error) {
      this.logger.error('Failed to connect to MinIO server', error);

      // In development, don't fail hard on connection issues
      if (this.configEnv.get('NODE_ENV') !== 'production') {
        this.logger.warn('MinIO connection failed in development - continuing anyway');
        return;
      }

      throw new Error('MinIO server is not reachable');
    }
  }

  /**
   * Ensure bucket exists, create if not
   */
  private async ensureBucket(bucketName: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucketName);

      if (exists) {
        this.logger.debug(`Bucket already exists: ${bucketName}`);
        return;
      }

      await this.client.makeBucket(bucketName, this.configMinio.region);
      this.logger.info(`Bucket created successfully: ${bucketName}`);
    } catch (error) {
      // Ignore if bucket already exists (race condition)
      if (error.code !== 'BucketAlreadyExists') {
        this.logger.error(`Failed to create bucket: ${bucketName}`, error);
        throw error;
      }
    }
  }

  /**
   * Get MinIO client instance
   * Memastikan client sudah ready sebelum digunakan
   */
  async getClient(): Promise<Minio.Client> {
    await this.initializationPromise;
    if (!this.isConnected && this.configEnv.get('NODE_ENV') !== 'test') throw new Error('MinIO client is not connected');
    return this.client;
  }

  /**
   * Get connection status
   */
  getStatus(): {
    connected: boolean;
    endpoint: string;
    port: number;
    buckets: string[];
  } {
    return {
      connected: this.isConnected,
      endpoint: this.configMinio.endpoint,
      port: this.configMinio.port,
      buckets: Object.values(this.configMinio.buckets),
    };
  }

  /**
   * Health check dengan latency measurement
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    timestamp: Date;
  }> {
    try {
      const startTime = Date.now();
      await this.client.listBuckets();
      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'unhealthy',
        latency: -1,
        timestamp: new Date(),
      };
    }
  }

  /**
   * NestJS lifecycle hook - Called when module is destroyed
   * Cleanup connections
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.client) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const agent = (this.client as any).agent;
        if (agent && typeof agent.destroy === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          agent.destroy(); // remove socket connection
          this.logger.info('MinIO HTTP Agent destroyed');
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
      this.isConnected = false;
      this.logger.info('MinIO provider destroyed');
      this.isConnected = false;
      this.logger.info('MinIO provider destroyed');
    } catch (error) {
      this.logger.error('Error during MinIO provider destruction', error);
    }
  }

  /**
   * Get bucket names
   */
  getBuckets(): {
    documents: string;
    images: string;
    backups: string;
    videos: string;
  } {
    return this.configMinio.buckets;
  }

  /**
   * Get config (useful untuk service layer)
   */
  getConfig(): MinioConfig {
    return this.configMinio;
  }
}
