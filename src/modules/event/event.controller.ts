import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EventService } from './event.service';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async list(@Paginate() query: PaginateQuery): Promise<TResponse<Paginated<Event>>> {
    const paginatedEvents = await this.eventService.list(query);
    return {
      message: 'get data event successfully',
      data: paginatedEvents,
    };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() CreateEventDto: CreateEventDto): Promise<TResponse<Event>> {
    const created = await this.eventService.create(CreateEventDto);
    return {
      message: 'create data event successfully',
      data: created,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('ids')
  async getIdEvents(): Promise<TResponse<number[]>> {
    const ids = await this.eventService.getIds();
    return {
      message: 'get data ids event successfully',
      data: ids,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOneByID(@Param('id') id: string): Promise<TResponse<Event>> {
    const Event = await this.eventService.findOneByID(id);
    return {
      message: 'get data event successfully',
      data: Event,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: UpdateEventDto): Promise<TResponse<boolean>> {
    const isUpdated = await this.eventService.update(id, payload);
    return {
      message: 'update data event successfully',
      data: isUpdated,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<TResponse<boolean>> {
    const isDeleted = await this.eventService.remove(id);
    return {
      message: 'delete data event successfully',
      data: isDeleted,
    };
  }
}
