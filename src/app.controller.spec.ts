import { Test, TestingModule } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { AppController } from './app.controller';
import { mockMinioProvider, mockEmailService } from '~/test/common/mock';
import { StorageHealthIndicator } from './infrastructure/storage/indicators/health.indicator';
import { MailPitHealthIndicator } from './infrastructure/email/email.health';
import { MinioProvider } from './infrastructure/storage/providers/minio.provider';
import { EmailService } from './infrastructure/email/email.service';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [AppController],
      providers: [
        StorageHealthIndicator,
        MailPitHealthIndicator,
        {
          provide: MinioProvider,
          useValue: mockMinioProvider,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
