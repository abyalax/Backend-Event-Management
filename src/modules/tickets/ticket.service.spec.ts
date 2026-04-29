import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { mockRepository, mockConfigService } from '~/test/common/mock';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';
import { CONFIG_SERVICE } from '~/infrastructure/config/config.provider';

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepository: Repository<Ticket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [],
      providers: [
        TicketService,
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
        {
          provide: 'PinoLogger',
          useValue: {
            setContext: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: REPOSITORY.TICKET,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.EVENT,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
    ticketRepository = module.get<Repository<Ticket>>(REPOSITORY.TICKET);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(ticketRepository).toBeDefined();
  });
});
