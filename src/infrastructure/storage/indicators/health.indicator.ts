import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { MinioProvider } from '../providers/minio.provider';

/**
 * Storage Health Indicator for NestJS Terminus
 *
 * Integration with NestJS health check system
 * Monitoring MinIO status as part of overall application health
 *
 * Usage in health check module:
 * @Module({
 *   imports: [TerminusModule],
 *   providers: [StorageHealthIndicator],
 *   controllers: [HealthController]
 * })
 *
 * In controller:
 * @Get('health')
 * @HealthCheck()
 * check() {
 *   return this.health.check([
 *     () => this.storageHealth.isHealthy('storage'),
 *   ]);
 * }
 */
@Injectable()
export class StorageHealthIndicator {
  constructor(
    private readonly minioProvider: MinioProvider,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  /**
   * Check MinIO health
   * @param key - Indicator key (default: 'storage')
   * @returns Health check result
   */
  async isHealthy(key: string = 'storage') {
    const indicator = this.healthIndicatorService.check(key);

    try {
      const health = await this.minioProvider.healthCheck();
      const status = this.minioProvider.getStatus();

      if (health.status === 'healthy') {
        return indicator.up({
          latency: `${health.latency}ms`,
          connected: status.connected,
          buckets: status.buckets,
        });
      } else {
        return indicator.down({
          latency: -1,
          connected: status.connected,
          error: 'MinIO health check failed',
        });
      }
    } catch (error) {
      return indicator.down({
        error: error.message,
      });
    }
  }
}
