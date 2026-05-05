import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { PaymentService } from '~/modules/payments/payment.service';
import { OrderService } from './order.service';
import { QRService } from '../qr-code/qr-code.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { mockEmailService, mockPdfService, mockRepository, mockStorageService } from '~/test/common/mock';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { PdfService } from '../pdf/pdf.service';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { DashboardCacheService } from '../dashboard/dashboard-cache.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { ReminderService } from '~/modules/reminders/reminder.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'test-secret',
          privateKey: 'test-private-key',
          publicKey: 'test-public-key',
        }),
      ],
      providers: [
        UserService,
        PaymentService,
        OrderService,
        QRService,
        ReminderService,
        DashboardCacheService,
        DashboardService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: PdfService,
          useValue: mockPdfService,
        },
        {
          provide: CONFIG_PROVIDER.QR,
          useValue: { secret: 'test-qr-secret' },
        },
        {
          provide: CONFIG_PROVIDER.EMAIL,
          useValue: {
            host: 'localhost',
            port: 1025,
            secure: false,
            auth: {
              user: 'test',
              pass: 'test',
            },
            from: 'test@example.com',
            fromName: 'Test',
          },
        },
        {
          provide: CONFIG_PROVIDER.ORDER,
          useValue: {
            urlApi: 'http://localhost:4000',
          },
        },
        {
          provide: CONFIG_SERVICE,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const config = {
                PAYMENT_PROVIDER: 'mock',
                XENDIT_SECRET_KEY: 'test-secret',
                XENDIT_CALLBACK_TOKEN: 'test-token',
              };
              return config[key as keyof typeof config];
            }),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            getOrSet: jest.fn(),
            clearByPattern: jest.fn(),
            del: jest.fn(),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: REPOSITORY.ORDER,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.ORDER_ITEM,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.TICKET,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.USER,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.TRANSACTION,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.PERMISSION,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.GENERATED_EVENT_TICKET,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.PAYMENT,
          useValue: mockRepository,
        },
        {
          provide: 'BullQueue_payment',
          useValue: {
            add: jest.fn(),
            process: jest.fn(),
            close: jest.fn(),
          },
        },
        {
          provide: ReminderService,
          useValue: {
            scheduleRemindersForOrder: jest.fn(),
            createReminder: jest.fn(),
            cancelReminder: jest.fn(),
            cancelRemindersForOrder: jest.fn(),
            processReminder: jest.fn(),
            getUserReminders: jest.fn(),
            getPendingReminders: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
