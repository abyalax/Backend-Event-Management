import { Injectable, Inject } from '@nestjs/common';
import { MediaObject } from './entitiy/media-objects.entity';
import { ConfigService, CONFIG_SERVICE } from '~/infrastructure/config/config.provider';

/**
 * URL Generation Service - Builds CDN URLs for media objects
 *
 * This service generates URLs for media objects stored in MinIO/any S3-compatible storage.
 * URLs are built dynamically and not stored in the database for flexibility.
 */
@Injectable()
export class UrlGenerationService {
  private readonly cdnUrl: string;

  constructor(@Inject(CONFIG_SERVICE) private readonly configService: ConfigService) {
    const minioEndpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const minioPort = this.configService.get('MINIO_PORT') || 9000;
    const minioUseSsl = this.configService.get('MINIO_USE_SSL') || false;
    const protocol = minioUseSsl ? 'https' : 'http';
    this.cdnUrl = `${protocol}://${minioEndpoint}:${minioPort}`;
  }

  /**
   * Build CDN URL for media object
   *
   * @param media - Media object
   * @returns Complete CDN URL
   */
  buildUrl(media: MediaObject): string {
    return `${this.cdnUrl}/${media.bucket}/${media.objectKey}`;
  }

  /**
   * Build CDN URL for media object by ID
   *
   * @param bucket - Bucket name
   * @param objectKey - Object key
   * @returns Complete CDN URL
   */
  buildUrlFromParts(bucket: string, objectKey: string): string {
    return `${this.cdnUrl}/${bucket}/${objectKey}`;
  }

  /**
   * Get CDN base URL
   *
   * @returns CDN base URL
   */
  getCdnBaseUrl(): string {
    return this.cdnUrl;
  }

  /**
   * Build URL with query parameters
   *
   * @param media - Media object
   * @param params - Query parameters
   * @returns CDN URL with query parameters
   */
  buildUrlWithParams(media: MediaObject, params: Record<string, string>): string {
    const baseUrl = this.buildUrl(media);
    const queryString = new URLSearchParams(params).toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  /**
   * Build thumbnail URL (adds thumbnail parameter)
   *
   * @param media - Media object
   * @param width - Thumbnail width (optional)
   * @param height - Thumbnail height (optional)
   * @returns Thumbnail URL
   */
  buildThumbnailUrl(media: MediaObject, width?: number, height?: number): string {
    const params: Record<string, string> = { thumbnail: 'true' };
    if (width) params.width = width.toString();
    if (height) params.height = height.toString();

    return this.buildUrlWithParams(media, params);
  }

  /**
   * Build optimized URL for web delivery
   *
   * @param media - Media object
   * @param format - Target format (webp, avif, etc.)
   * @param quality - Image quality (0-100)
   * @returns Optimized URL
   */
  buildOptimizedUrl(media: MediaObject, format?: string, quality?: number): string {
    const params: Record<string, string> = {};
    if (format) params.format = format;
    if (quality) params.quality = quality.toString();

    return this.buildUrlWithParams(media, params);
  }
}
