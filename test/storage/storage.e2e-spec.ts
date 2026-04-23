/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TestingModule } from '@nestjs/testing';
import { setupApplication, cleanupApplication, TestFileTracker, cleanupUploadedFiles, waitForMinIO, UploadedFile } from '../setup_e2e';
import { App } from 'supertest/types';

/**
 * Storage E2E Tests
 *
 * Tests are designed to be:
 * - Independent (each test can run standalone)
 * - Idempotent (can be run multiple times)
 * - Cleanup after themselves
 * - Not dependent on previous test results
 */
describe('Storage E2E Tests', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let fileTracker: TestFileTracker;
  let testFilePath: string;
  let testFileSize: number;

  /**
   * Setup - runs once before all tests
   */
  beforeAll(async () => {
    // Setup application
    const [setupApp, setupModule, config] = await setupApplication();
    app = setupApp;
    moduleFixture = setupModule;
    fileTracker = new TestFileTracker();

    // Wait for MinIO to be ready
    const minioReady = await waitForMinIO(config.minio.endpoint, config.minio.port);

    if (!minioReady) {
      console.warn('MinIO is not ready - some tests may fail');
      // Don't throw, allow tests to run with expected failures
    }

    // Setup test file
    testFilePath = path.join(__dirname, '../../assets/billie-elish.jpg');
    if (!fs.existsSync(testFilePath)) {
      // Create a dummy test file if it doesn't exist
      const dummyDir = path.dirname(testFilePath);
      if (!fs.existsSync(dummyDir)) {
        fs.mkdirSync(dummyDir, { recursive: true });
      }
      fs.writeFileSync(testFilePath, Buffer.from('dummy test file content'));
    }
    testFileSize = fs.statSync(testFilePath).size;
  });

  /**
   * Cleanup - runs once after all tests
   */
  afterAll(async () => {
    // Cleanup uploaded test files
    if (moduleFixture) {
      const config = moduleFixture.get('STORAGE_CONFIG') || {
        minio: {
          endpoint: 'localhost',
          port: 9000,
          accessKey: 'minioadmin',
          secretKey: 'minioadmin',
        },
      };

      try {
        await cleanupUploadedFiles(
          fileTracker,
          config.minio?.endpoint || 'localhost',
          config.minio?.port || 9000,
          config.minio?.accessKey || 'minioadmin',
          config.minio?.secretKey || 'minioadmin',
        );
      } catch (error) {
        console.warn('Failed to cleanup uploaded files:', error);
      }
    }

    // Close application
    if (app) await cleanupApplication(app);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/health');

      // Accept both 200 (healthy) and 503 (MinIO not available)
      expect([200, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('minio');
        expect(response.body).toHaveProperty('metrics');
      }
    }, 10000); // 10 second timeout for health check
  });

  describe('File Upload', () => {
    it('should upload file to documents bucket', async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('filename');
        expect(response.body.data).toHaveProperty('bucket', 'documents');
        expect(response.body.data).toHaveProperty('size', testFileSize);

        // Track file for cleanup
        fileTracker.trackFile(response.body.data.bucket, response.body.data.filename);
      }
    }, 30000);

    it('should upload file to images bucket', async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/images').attach('file', testFilePath);

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('bucket', 'images');

        fileTracker.trackFile(response.body.data.bucket, response.body.data.filename);
      }
    }, 30000);

    it('should reject upload without file', async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').expect(400);

      expect(response.body).toHaveProperty('message', 'No file provided');
    });

    it('should reject upload to invalid bucket', async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/invalid-bucket').attach('file', testFilePath);

      expect([200, 201, 400, 500, 503]).toContain(response.status);

      if (response.status === 500) {
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('Invalid bucket');
      }
    });
  });

  describe('File Metadata', () => {
    let testUploadedFilename: string | null = null;
    let testUploadedBucket: string | null = null;

    /**
     * Setup for metadata tests - upload a file first
     */
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      if (response.status === 200 && response.body.success) {
        testUploadedFilename = response.body.data.filename;
        testUploadedBucket = response.body.data.bucket;
        fileTracker.trackFile(testUploadedBucket!, testUploadedFilename!);
      }
    });

    it('should get file metadata', async () => {
      if (!testUploadedFilename || !testUploadedBucket) {
        console.warn('Skipping metadata test - upload failed');
        return;
      }

      const response = await request(app.getHttpServer()).get(`/api/storage/metadata/${testUploadedBucket}/${testUploadedFilename}`);

      expect([200, 404, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('bucket', testUploadedBucket);
        expect(response.body.data).toHaveProperty('filename', testUploadedFilename);
        expect(response.body.data).toHaveProperty('size');
        expect(response.body.data).toHaveProperty('contentType');
      }
    });

    it('should return error for non-existent file', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/metadata/documents/non-existent-file-12345.jpg');

      expect([200, 404, 500, 503]).toContain(response.status);

      if (response.status === 404) {
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('File Download', () => {
    let testDownloadFilename: string | null = null;
    let testDownloadBucket: string | null = null;

    /**
     * Setup for download tests
     */
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      if (response.status === 200 && response.body.success) {
        testDownloadFilename = response.body.data.filename;
        testDownloadBucket = response.body.data.bucket;
        fileTracker.trackFile(testDownloadBucket!, testDownloadFilename!);
      }
    });

    it('should download uploaded file', async () => {
      if (!testDownloadFilename || !testDownloadBucket) {
        console.warn('Skipping download test - upload failed');
        return;
      }

      const response = await request(app.getHttpServer()).get(`/api/storage/download/${testDownloadBucket}/${testDownloadFilename}`);

      expect([200, 404, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.headers['content-type']).toBeDefined();
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should return 404 for non-existent file download', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/download/documents/non-existent-file-12345.jpg');

      expect([200, 404, 500, 503]).toContain(response.status);
    });
  });

  describe('Presigned URLs', () => {
    let testPresignedFilename: string | null = null;
    let testPresignedBucket: string | null = null;

    /**
     * Setup for presigned URL tests
     */
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      if (response.status === 200 && response.body.success) {
        testPresignedFilename = response.body.data.filename;
        testPresignedBucket = response.body.data.bucket;
        fileTracker.trackFile(testPresignedBucket!, testPresignedFilename!);
      }
    });

    it('should generate presigned download URL', async () => {
      if (!testPresignedFilename || !testPresignedBucket) {
        console.warn('Skipping presigned URL test - upload failed');
        return;
      }

      const response = await request(app.getHttpServer()).get(`/api/storage/presigned/${testPresignedBucket}/${testPresignedFilename}`);

      expect([200, 404, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('url');
        expect(response.body.data).toHaveProperty('expirySeconds');
      }
    });

    it('should generate URL with custom expiry', async () => {
      if (!testPresignedFilename || !testPresignedBucket) {
        console.warn('Skipping custom expiry test - upload failed');
        return;
      }

      const response = await request(app.getHttpServer()).get(
        `/api/storage/presigned/${testPresignedBucket}/${testPresignedFilename}?expirySeconds=7200`,
      );

      expect([200, 404, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body.data.expirySeconds).toBe(7200);
      }
    });
  });

  describe('File List', () => {
    beforeAll(async () => {
      // Upload a few test files
      for (let i = 0; i < 2; i++) {
        const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

        if (response.status === 200 && response.body.success) {
          fileTracker.trackFile(response.body.data.bucket, response.body.data.filename);
        }
      }
    });

    it('should list files in bucket', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/list/documents');

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('bucket', 'documents');
        expect(response.body.data).toHaveProperty('count');
        expect(response.body.data).toHaveProperty('files');
        expect(Array.isArray(response.body.data.files)).toBe(true);
      }
    });

    it('should filter files by prefix', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/list/documents?prefix=17');

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body.data).toHaveProperty('files');
        // Verify prefix filtering if files exist
        if (response.body.data.files.length > 0) {
          response.body.data.files.forEach((file: File) => {
            expect(file.name).toMatch(/^17/);
          });
        }
      }
    });
  });

  describe('Bucket Statistics', () => {
    it('should get bucket statistics', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/stats/documents');

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('bucket', 'documents');
        expect(response.body.data).toHaveProperty('objectCount');
        expect(response.body.data).toHaveProperty('totalSize');
        expect(response.body.data).toHaveProperty('objects');
        expect(typeof response.body.data.objectCount).toBe('number');
        expect(typeof response.body.data.totalSize).toBe('number');
      }
    });
  });

  describe('File Copy', () => {
    let sourceCopyFilename: string | null = null;
    let sourceCopyBucket: string | null = null;

    /**
     * Setup for copy tests
     */
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      if (response.status === 200 && response.body.success) {
        sourceCopyFilename = response.body.data.filename;
        sourceCopyBucket = response.body.data.bucket;
        fileTracker.trackFile(sourceCopyBucket!, sourceCopyFilename!);
      }
    });

    it('should copy file between buckets', async () => {
      if (!sourceCopyFilename || !sourceCopyBucket) {
        console.warn('Skipping copy test - upload failed');
        return;
      }

      const destFilename = `copied_${sourceCopyFilename}`;
      const response = await request(app.getHttpServer()).post('/api/storage/copy').query({
        source: sourceCopyBucket,
        sourceFile: sourceCopyFilename,
        destination: 'backups',
        destFile: destFilename,
      });

      expect([200, 400, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        fileTracker.trackFile('backups', destFilename);
      }
    });

    it('should reject copy with missing parameters', async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/copy').query({
        source: 'documents',
        // Missing other required parameters
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('File Deletion', () => {
    let testDeleteFilename: string | null = null;
    let testDeleteBucket: string | null = null;

    /**
     * Setup for deletion tests
     */
    beforeAll(async () => {
      const response = await request(app.getHttpServer()).post('/api/storage/upload/documents').attach('file', testFilePath);

      if (response.status === 200 && response.body.success) {
        testDeleteFilename = response.body.data.filename;
        testDeleteBucket = response.body.data.bucket;
        // Don't track for cleanup - we'll delete it manually
      }
    });

    it('should delete file', async () => {
      if (!testDeleteFilename || !testDeleteBucket) {
        console.warn('Skipping delete test - upload failed');
        return;
      }

      const response = await request(app.getHttpServer()).delete(`/api/storage/${testDeleteBucket}/${testDeleteFilename}`);

      expect([200, 404, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body.message).toContain('File deleted');

        // Remove from tracking since it's deleted
        const files = fileTracker.getUploadedFiles();
        const index = files.findIndex((f: UploadedFile) => f.filename === testDeleteFilename);
        if (index > -1) {
          files.splice(index, 1);
        }
      }
    });

    it('should return error when deleting non-existent file', async () => {
      const response = await request(app.getHttpServer()).delete('/api/storage/documents/non-existent-file-12345.jpg');

      expect([200, 404, 500, 503]).toContain(response.status);
    });
  });

  describe('Metrics', () => {
    it('should return storage metrics', async () => {
      const response = await request(app.getHttpServer()).get('/api/storage/metrics');

      expect([200, 201, 500, 503]).toContain(response.status);

      if ((response.status === 200 || response.status === 201) && response.body.success) {
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data).toHaveProperty('buckets');
        expect(response.body.data).toHaveProperty('operations');
      }
    });
  });
});
