import type { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';
import * as dotenv from 'dotenv';

import { MediaObject } from '~/infrastructure/storage/entitiy/media-objects.entity';

import { mockMediaObjects } from '../mock/media-object.mock';
import { MinioUploadUtil, type MinioUploadConfig } from '../utils/minio-upload.util';

dotenv.config();

export default class MediaObjectSeeder implements Seeder {
  track = true;

  public async run(dataSource: DataSource): Promise<void> {
    const mediaRepo = dataSource.getRepository(MediaObject);

    // Upload banner images to MinIO first
    await this.uploadBannerImages();

    await mediaRepo.insert(mockMediaObjects);
    console.log('Media objects seeded successfully');
  }

  private async uploadBannerImages(): Promise<void> {
    try {
      const minioConfig: MinioUploadConfig = {
        endpoint: process.env.MINIO_ENDPOINT || 'localhost',
        port: Number.parseInt(process.env.MINIO_PORT || '9000'),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
        region: process.env.MINIO_REGION || 'us-east-1',
      };

      const uploadUtil = new MinioUploadUtil(minioConfig);
      await uploadUtil.uploadBannerImages();
    } catch (error) {
      console.warn('Failed to upload banner images to MinIO:', error.message);
      console.log('Continuing with database seeding (MinIO may not be available)');
    }
  }
}
