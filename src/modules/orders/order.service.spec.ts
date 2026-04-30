import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { REPOSITORY } from '~/common/constants/database';
import { PaymentService } from '~/modules/payments/payment.service';
import { OrderService } from './order.service';
import { QRService } from '../qr-code/qr-code.service';
import { EmailService } from '~/infrastructure/email/email.service';
import { mockConfigService, mockEmailService, mockPdfService, mockRepository, mockStorageService } from '~/test/common/mock';
import { StorageService } from '~/infrastructure/storage/storage.service';
import { PdfService } from '../pdf/pdf.service';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { JwtModule } from '@nestjs/jwt';
import { UserService } from '../users/user.service';

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
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
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
          provide: 'BullQueue_payment',
          useValue: {
            add: jest.fn(),
            process: jest.fn(),
            close: jest.fn(),
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
