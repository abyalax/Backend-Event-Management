import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { mockConfigService, mockRepository } from '~/test/common/mock';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { OrderService } from '~/modules/orders/order.service';
import { PinoLogger } from 'nestjs-pino';
import { REPOSITORY } from '~/common/constants/database';

describe('TicketController', () => {
  let controller: TicketController;
  let ticketService: TicketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      controllers: [TicketController],
      providers: [
        TicketService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: REPOSITORY.TICKET,
          useValue: mockRepository,
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
          provide: OrderService,
          useValue: {
            createOrder: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<TicketController>(TicketController);
    ticketService = module.get<TicketService>(TicketService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(ticketService).toBeDefined();
  });
});
