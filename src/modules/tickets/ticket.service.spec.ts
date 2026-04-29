import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { ConfigModule } from '~/infrastructure/config/config.module';
import { LoggerModule } from '~/common/logger/logger.module';
import { mockRepository } from '~/test/common/mock';
import { Ticket } from './entities/ticket.entity';
import { TicketService } from './ticket.service';

describe('TicketService', () => {
  let service: TicketService;
  let ticketRepository: Repository<Ticket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, LoggerModule],
      providers: [
        TicketService,
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
