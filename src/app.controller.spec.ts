import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageHealthIndicator } from './infrastructure/storage/indicators/health.indicator';
import { MailPitHealthIndicator } from './infrastructure/email/email.health';
import { MinioProvider } from './infrastructure/storage/providers/minio.provider';
import { EmailService } from './infrastructure/email/email.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [AppController],
      providers: [
        AppService,
        StorageHealthIndicator,
        MailPitHealthIndicator,
        {
          provide: MinioProvider,
          useValue: {
            healthCheck: jest.fn().mockResolvedValue({ status: 'healthy', latency: 10 }),
            getStatus: jest.fn().mockReturnValue({ connected: true, buckets: 2 }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            verifyConnection: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World! Nest ready to serve!!');
    });
  });
});
