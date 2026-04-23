import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { MinioProvider } from '../providers/minio.provider';

/**
 * Storage Health Indicator untuk NestJS Terminus
 *
 * Integration dengan NestJS health check system
 * Memungkinkan monitoring MinIO status sebagai bagian dari overall application health
 *
 * Usage dalam health check module:
 * @Module({
 *   imports: [TerminusModule],
 *   providers: [StorageHealthIndicator],
 *   controllers: [HealthController]
 * })
 *
 * Dalam controller:
 * @Get('health')
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.storageHealth.isHealthy('storage'),
 *   ]);
 * }
 */
@Injectable()
export class StorageHealthIndicator extends HealthIndicator {
  constructor(private minioProvider: MinioProvider) {
    super();
  }

  /**
   * Check MinIO health
   * @param key - Indicator key (default: 'storage')
   * @returns Health check result
   */
  async isHealthy(key: string = 'storage'): Promise<HealthIndicatorResult> {
    try {
      const health = await this.minioProvider.healthCheck();
      const status = this.minioProvider.getStatus();

      if (health.status === 'healthy') {
        return this.getStatus(key, true, {
          latency: `${health.latency}ms`,
          connected: status.connected,
          buckets: status.buckets,
        });
      } else {
        throw new HealthCheckError(
          'MinIO health check failed',
          this.getStatus(key, false, {
            latency: -1,
            connected: status.connected,
          })
        );
      }
    } catch (error) {
      throw new HealthCheckError(
        'MinIO connection error',
        this.getStatus(key, false, {
          error: error.message,
        })
      );
    }
  }
}
