import { Client } from 'minio';
import fs from 'node:fs';
import path from 'node:path';
import { PinoLogger } from 'nestjs-pino';

export interface MinioUploadConfig {
  endpoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
}

/**
 * Utility untuk upload file ke MinIO saat seeding
 */
export class MinioUploadUtil {
  private readonly client: Client;
  private readonly logger = new PinoLogger({});

  constructor(private readonly config: MinioUploadConfig) {
    this.client = new Client({
      endPoint: config.endpoint,
      port: config.port,
      useSSL: config.useSSL,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      region: config.region,
    });
  }

  /**
   * Upload file ke MinIO bucket
   */
  async uploadFile(
    bucketName: string,
    objectKey: string,
    filePath: string,
    mimeType?: string,
  ): Promise<{ success: boolean; error?: string; size?: number }> {
    try {
      if (!fs.existsSync(filePath)) {
        const error = `File not found: ${filePath}`;
        this.logger.error(error);
        return { success: false, error };
      }

      // Ensure bucket exists
      const bucketExists = await this.client.bucketExists(bucketName);
      if (!bucketExists) {
        await this.client.makeBucket(bucketName, this.config.region);
        this.logger.info(`Bucket created: ${bucketName}`);
      }

      // Get file stats
      const fileStats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);

      // Upload file
      const metaData = mimeType ? { 'Content-Type': mimeType } : undefined;
      await this.client.putObject(bucketName, objectKey, fileStream, fileStats.size, metaData);

      this.logger.info(`File uploaded successfully: ${bucketName}/${objectKey} (${fileStats.size} bytes)`);
      return { success: true, size: fileStats.size };
    } catch (error: unknown) {
      const errorMessage = `Failed to upload ${objectKey}: ${(error as Error).message}`;
      this.logger.error(errorMessage, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload banner images untuk seeding
   */
  async uploadBannerImages(): Promise<void> {
    const assetsPath = path.join(__dirname, '../../../../assets');
    const bucketName = 'events-public';

    const uploads = [
      {
        objectKey: 'banners/tech-conference-2024.png',
        filePath: path.join(assetsPath, 'tech-conference-2024.png'),
        mimeType: 'image/png',
      },
      {
        objectKey: 'posters/web-dev-workshop.png',
        filePath: path.join(assetsPath, 'web-dev-workshop.png'),
        mimeType: 'image/png',
      },
      {
        objectKey: 'banners/data-science-summit.png',
        filePath: path.join(assetsPath, 'data-science-summit.png'),
        mimeType: 'image/png',
      },
      {
        objectKey: 'thumbnails/startup-pitch-night.png',
        filePath: path.join(assetsPath, 'startup-pitch-night.png'),
        mimeType: 'image/png',
      },
      {
        objectKey: 'gallery/mobile-app-bootcamp.png',
        filePath: path.join(assetsPath, 'mobile-app-bootcamp.png'),
        mimeType: 'image/png',
      },
    ];

    console.log('Uploading banner images to MinIO...');

    for (const upload of uploads) {
      const result = await this.uploadFile(bucketName, upload.objectKey, upload.filePath, upload.mimeType);
      if (result.success) {
        console.log(`  Uploaded: ${upload.objectKey} (${result.size} bytes)`);
      } else {
        console.error(`  Failed: ${upload.objectKey} - ${result.error}`);
      }
    }

    console.log('Banner images upload completed');
  }
}
