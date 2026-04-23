import { Injectable, NestMiddleware, BadRequestException, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService, CONFIG_SERVICE } from '~/infrastructure/config/config.provider';

/**
 * File Validation Middleware
 *
 * Validates file uploads before they reach the controller:
 * - File size limits
 * - MIME type restrictions
 * - Filename sanitization
 * - Malicious file detection
 */
@Injectable()
export class FileValidationMiddleware implements NestMiddleware {
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSize: number;
  private readonly dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.pif',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
    '.app',
    '.deb',
    '.pkg',
    '.dmg',
    '.rpm',
    '.msi',
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.sh',
    '.ps1',
    '.py',
    '.rb',
    '.pl',
    '.lua',
    '.sql',
  ];

  constructor(@Inject(CONFIG_SERVICE) private readonly configService: ConfigService) {
    this.allowedMimeTypes = this.configService.get('ALLOWED_MIME_TYPES')?.split(',') || [];
    this.maxFileSize = Number.parseInt(String(this.configService.get('MAX_FILE_SIZE') || '52428800')); // 50MB default
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Only validate for upload endpoints
    if (!req.path.includes('/upload/') || !req.file) {
      return next();
    }

    const file = req.file;

    try {
      // Validate file size
      this.validateFileSize(file);

      // Validate MIME type
      this.validateMimeType(file);

      // Validate filename
      this.validateFilename(file);

      // Scan for malicious content (basic checks)
      this.validateFileContent(file);

      next();
    } catch (error) {
      // Remove uploaded file if validation fails
      if (file.buffer) {
        // Clear the buffer reference
        file.buffer = undefined as unknown as Buffer<ArrayBufferLike>;
      }

      next(error);
    }
  }

  private validateFileSize(file: Express.Multer.File): void {
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(`File size (${file.size} bytes) exceeds maximum allowed size (${this.maxFileSize} bytes)`);
    }

    // Check for empty files
    if (file.size === 0) {
      throw new BadRequestException('File cannot be empty');
    }
  }

  private validateMimeType(file: Express.Multer.File): void {
    // If no MIME types are specified, allow all
    if (this.allowedMimeTypes.length === 0) {
      return;
    }

    // Check if MIME type is allowed
    const isAllowed = this.allowedMimeTypes.some((mime) => {
      // Support wildcards like 'image/*'
      if (mime.endsWith('/*')) {
        const category = mime.split('/')[0];
        return file.mimetype.startsWith(category + '/');
      }
      return file.mimetype === mime;
    });

    if (!isAllowed) {
      throw new BadRequestException(`MIME type '${file.mimetype}' is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`);
    }
  }

  private validateFilename(file: Express.Multer.File): void {
    const filename = file.originalname.toLowerCase();

    // Check for dangerous file extensions
    const hasDangerousExtension = this.dangerousExtensions.some((ext) => filename.endsWith(ext));

    if (hasDangerousExtension) {
      throw new BadRequestException(`File extension not allowed for security reasons. Dangerous extensions: ${this.dangerousExtensions.join(', ')}`);
    }

    // Check for suspicious characters in filename
    // eslint-disable-next-line no-control-regex
    const suspiciousChars = /[<>:"|?*\x00-\x1f]/;
    if (suspiciousChars.test(filename)) {
      throw new BadRequestException('Filename contains invalid characters');
    }

    // Check for filename length
    if (filename.length > 255) {
      throw new BadRequestException('Filename is too long (max 255 characters)');
    }

    // Check for reserved names (Windows)
    const reservedNames = [
      'con',
      'prn',
      'aux',
      'nul',
      'com1',
      'com2',
      'com3',
      'com4',
      'com5',
      'com6',
      'com7',
      'com8',
      'com9',
      'lpt1',
      'lpt2',
      'lpt3',
      'lpt4',
      'lpt5',
      'lpt6',
      'lpt7',
      'lpt8',
      'lpt9',
    ];

    const nameWithoutExt = filename.split('.')[0];
    if (reservedNames.includes(nameWithoutExt)) {
      throw new BadRequestException('Filename is a reserved system name');
    }
  }

  private validateFileContent(file: Express.Multer.File): void {
    if (!file.buffer || file.buffer.length === 0) {
      return;
    }

    const buffer = file.buffer;
    const content = buffer.toString('binary', 0, Math.min(1024, buffer.length));

    // Basic malware signatures (simplified)
    const malwareSignatures = [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi,
      /shell_exec\s*\(/gi,
      /passthru\s*\(/gi,
      /<script[^>]*>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
    ];

    const hasMalwareSignature = malwareSignatures.some((signature) => signature.test(content));

    if (hasMalwareSignature) {
      throw new BadRequestException('File contains potentially malicious content');
    }

    // Check for executable headers (very basic)
    const executableHeaders = [
      Buffer.from([0x4d, 0x5a]), // PE/EXE
      Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
      Buffer.from([0xca, 0xfe, 0xba, 0xbe]), // Java class
      Buffer.from([0xfe, 0xed, 0xfa, 0xce]), // Mach-O binary
    ];

    const hasExecutableHeader = executableHeaders.some((header) => {
      if (buffer.length < header.length) return false;
      return buffer.compare(header, 0, header.length, 0, header.length) === 0;
    });

    if (hasExecutableHeader) {
      throw new BadRequestException('Executable files are not allowed');
    }
  }
}
