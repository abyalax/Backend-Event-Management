import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entity/ticket.entity';
import { TicketService } from './ticket.service';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async find(@Query() query: QueryTicketDto): Promise<TResponse<Paginated<Ticket>>> {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const paginatedEvents = await this.ticketService.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
    });
    return {
      message: 'get data ticket successfully',
      data: paginatedEvents,
    };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() CreateTicketDto: CreateTicketDto): Promise<TResponse<Ticket>> {
    const created = await this.ticketService.create(CreateTicketDto);
    return {
      message: 'create ticket successfully',
      data: created,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('ids')
  async getIdTickets(): Promise<TResponse<number[]>> {
    const ids = await this.ticketService.getIds();
    return {
      message: 'get ticket ids succesfully',
      data: ids,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOneByID(@Param('id') id: string): Promise<TResponse<Ticket>> {
    const ticket = await this.ticketService.findOneByID(id);
    return {
      message: 'get data ticket succesfully',
      data: ticket,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: UpdateTicketDto): Promise<TResponse<Ticket>> {
    const isUpdated = await this.ticketService.update(id, payload);
    return {
      message: 'update data ticket succesfully',
      data: isUpdated,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<TResponse<boolean>> {
    const isDeleted = await this.ticketService.remove(id);
    return {
      message: 'delete data ticket succesfully',
      data: isDeleted,
    };
  }
}
