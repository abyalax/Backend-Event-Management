import { Controller, Post, Patch, Param, Body, HttpCode, HttpStatus, NotFoundException, BadRequestException, Inject, Get } from '@nestjs/common';
import { MediaObject } from '../entitiy/media-objects.entity';
import { StorageService } from '../storage.service';
import { MediaRepository } from './media.repository';
import { ConfigService, CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { TResponse } from '~/common/types/response';
import { PresignedUrlDto, EAccessType } from '../dto/presigned-url.dto';
import { PinoLogger } from 'nestjs-pino';

export interface PresignedUrlResponse {
  url: string;
  mediaId: string;
  objectKey: string;
  bucket: string;
  accessType: EAccessType;
  expiresAt: string;
}

export interface ConfirmMediaRequest {
  uploaded: boolean;
  actualSize?: number;
}

/**
 * Media Controller - Handles media upload workflow
 *
 * Workflow:
 * 1. POST /media/presigned - Get presigned URL for upload
 * 2. PUT presigned-url - Client uploads directly to storage
 * 3. PATCH /media/:id/confirm - Confirm successful upload
 */
@Controller('media')
export class MediaController {
  private readonly defaultBucket: string;
  private readonly publicBucket: string;
  private readonly cdnUrl: string;

  constructor(
    private readonly logger: PinoLogger,
    private readonly storageService: StorageService,
    private readonly mediaRepository: MediaRepository,
    @Inject(CONFIG_SERVICE) private readonly configService: ConfigService,
  ) {
    this.defaultBucket = this.configService.get('STORAGE_BUCKET_IMAGES');
    this.publicBucket = this.configService.get('STORAGE_BUCKET_IMAGES_PUBLIC');
    const minioEndpoint = this.configService.get('MINIO_ENDPOINT');
    const minioPort = this.configService.get('MINIO_PORT');
    const minioUseSsl = this.configService.get('MINIO_USE_SSL');
    const protocol = minioUseSsl ? 'https' : 'http';
    this.cdnUrl = `${protocol}://${minioEndpoint}:${minioPort}`;
  }

  /**
   * Get presigned URL for file upload
   *
   * @param request - Upload request with file details
   * @returns Presigned URL and media ID
   */
  @Post('presigned')
  @HttpCode(HttpStatus.CREATED)
  async getPresignedUrl(@Body() request: PresignedUrlDto): Promise<TResponse<PresignedUrlResponse>> {
    const { filename, mimeType, size, bucket = this.defaultBucket, accessType = EAccessType.PRIVATE } = request;

    // Validate input
    if (!filename || !mimeType) throw new BadRequestException('filename and mimeType are required');

    // Determine target bucket based on access type
    const targetBucket = accessType === EAccessType.PUBLIC ? this.publicBucket : bucket;

    // Generate unique object key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = filename.split('.').pop() || '';
    const objectKey = `${timestamp}_${random}.${extension}`;

    // Create media record in database
    try {
      const media = await this.mediaRepository.create({
        bucket: targetBucket,
        objectKey,
        mimeType,
        size: size || 0,
        originalName: filename,
        uploadedBy: 'system',
        accessType,
      });

      // Generate presigned PUT URL
      const presignedUrl = await this.storageService.getPresignedPutUrl(targetBucket, objectKey, 3600);

      return {
        message: 'Presigned URL generated successfully',
        data: {
          url: presignedUrl,
          mediaId: media.id,
          objectKey,
          bucket: targetBucket,
          accessType,
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate presigned URL: ${(error as Error).message}`);
    }
  }

  /**
   * Confirm successful media upload
   *
   * @param id - Media ID
   * @param request - Confirmation request
   * @returns Updated media record
   */
  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmUpload(@Param('id') id: string, @Body() request: ConfirmMediaRequest): Promise<TResponse<MediaObject>> {
    const { uploaded, actualSize } = request;

    if (uploaded === undefined) throw new BadRequestException('uploaded field is required');

    const media = await this.mediaRepository.findById(id);
    if (!media) throw new NotFoundException(`Media with ID ${id} not found`);

    if (!uploaded) {
      // Delete the media record if upload failed
      await this.mediaRepository.remove(media);

      return {
        message: 'Media upload cancelled and record deleted',
        data: media,
      };
    }

    // Verify file exists in storage
    try {
      const metadata = await this.storageService.getFileMetadata(media.bucket, media.objectKey);

      // Update media record with actual file info
      media.size = actualSize || metadata.size;
      if (metadata.contentType) media.mimeType = metadata.contentType;

      // Save updated media record
      await this.mediaRepository.create(media);
    } catch (error) {
      // File doesn't exist in storage, delete the record
      await this.mediaRepository.remove(media);
      throw new BadRequestException(`File not found in storage. Media record deleted: ${(error as Error).message}`);
    }

    return {
      message: 'Media upload confirmed successfully',
      data: media,
    };
  }

  /**
   * Get media URL (CDN link)
   *
   * @param id - Media ID
   * @returns Media URL
   */
  @Get(':id/url')
  @HttpCode(HttpStatus.OK)
  async getMediaUrl(@Param('id') id: string): Promise<TResponse<{ url: string }>> {
    const media = await this.mediaRepository.findById(id);

    if (!media) throw new NotFoundException(`Media with ID ${id} not found`);

    const url = this.buildUrl(media);

    return {
      message: 'Media URL generated successfully',
      data: { url },
    };
  }

  /**
   * List all public media URLs (for banners, posters, etc)
   * This endpoint is efficient for frontend to get all public images
   * without generating URLs on-demand per file
   *
   * @returns List of public media URLs
   */
  @Get('public/list')
  @HttpCode(HttpStatus.OK)
  async getPublicMediaList(): Promise<TResponse<{ id: string; url: string; originalName?: string; mimeType?: string }[]>> {
    const publicMedia = await this.mediaRepository.findByAccessType(EAccessType.PUBLIC);

    const mediaList = publicMedia.map((media: MediaObject) => ({
      id: media.id,
      url: this.buildUrl(media),
      originalName: media.originalName,
      mimeType: media.mimeType,
    }));

    return {
      message: 'Public media list retrieved successfully',
      data: mediaList,
    };
  }

  /**
   * Build CDN URL for media object
   * For public files, returns direct CDN URL
   * For private files, returns direct CDN URL (can be modified to use presigned URLs if needed)
   *
   * @param media - Media object
   * @returns CDN URL
   */
  private buildUrl(media: MediaObject): string {
    const baseUrl = `${this.cdnUrl}/${media.bucket}/${media.objectKey}`;

    // For public files, return direct URL
    // For private files, you could generate presigned URLs here if needed
    // Currently returning direct URL for both, but can be modified
    return baseUrl;
  }
}
