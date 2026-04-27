import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { REPOSITORY } from '~/common/constants/database';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { mockRepository } from '~/test/common/mock';
import { TicketController } from './ticket.controller';
import { TicketService } from './ticket.service';
import { OrderService } from '~/modules/orders/order.service';

describe('TicketController', () => {
  let controller: TicketController;
  let ticketService: TicketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LoggerModule],
      controllers: [TicketController],
      providers: [
        TicketService,
        {
          provide: REPOSITORY.TICKET,
          useValue: mockRepository,
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
          useValue: {
            get: jest.fn(),
          },
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
