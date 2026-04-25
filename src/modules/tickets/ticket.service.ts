import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { REPOSITORY } from '~/common/constants/database';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entity/ticket.entity';
import { TICKET_PAGINATION_CONFIG } from './ticket-pagination.config';

@Injectable()
export class TicketService {
  constructor(
    @Inject(REPOSITORY.TICKET)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async list(query: PaginateQuery) {
    return paginate(query, this.ticketRepository, TICKET_PAGINATION_CONFIG);
  }

  async getIds(): Promise<number[]> {
    const rows = await this.ticketRepository.find({ select: {} });
    return rows.map((r) => Number(r.id));
  }

  async create(payloadTicket: CreateTicketDto) {
    const ticket = this.ticketRepository.create({
      ...payloadTicket,
      eventId: String(payloadTicket.eventId),
    });
    const created = await this.ticketRepository.save(ticket);
    return created;
  }

  async findOneByID(id: string) {
    const ticket = await this.ticketRepository.findOneBy({ id });
    if (ticket === null) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, payloadTicket: UpdateTicketDto) {
    const ticket = await this.ticketRepository.preload({
      id: id,
      ...payloadTicket,
    });
    if (!ticket) throw new NotFoundException(`Ticket with ID ${id} not found`);
    return await this.ticketRepository.save(ticket);
  }

  async remove(id: string) {
    const result = await this.ticketRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException(`Ticket with ID ${id} not found`);
    return true;
  }
}
