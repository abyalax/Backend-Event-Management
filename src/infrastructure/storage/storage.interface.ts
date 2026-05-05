import { Readable } from 'node:stream';

export interface StorageConfig {
  buckets: {
    [key: string]: string;
  };
  maxFileSize: number;
  allowedMimeTypes?: string[];
}

export interface UploadFileParams {
  bucket: string;
  file: Buffer;
  metadata: {
    originalname: string;
    mimetype: string;
  };
}

export interface UploadStreamParams {
  bucket: string;
  filename: string;
  stream: Readable;
  size: number;
  contentType: string;
}

export interface FileMetadata {
  bucket: string;
  filename: string;
  size: number;
  contentType: string;
  etag: string;
  uploadedAt: Date;
  lastModified: Date;
}

export interface FileOperationResult {
  success: boolean;
  filename: string;
  bucket: string;
  size?: number;
  url?: string;
  error?: string;
  duration: number;
}

export interface BucketStatistics {
  bucket: string;
  objectCount: number;
  totalSize: number;
  objects: Array<{
    name: string;
    size: number;
    lastModified: Date;
  }>;
}
