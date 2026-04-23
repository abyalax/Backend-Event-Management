import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, BadRequestException } from '@nestjs/common';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entity/event.entity';
import { EventMedia } from './entity/event-media.entity';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';
import { ParseUUIDPipe } from '~/common/pipes/parse-uuid.pipe';
import { AttachMediaRequest } from './event.interface';

@Controller('events')
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly eventRepository: EventRepository,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async list(@Query() query: QueryEventDto): Promise<TResponse<Paginated<Event>>> {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const paginatedEvents = await this.eventService.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
    });
    return {
      message: 'get data event successfully',
      data: paginatedEvents,
    };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('')
  async create(@Body() payload: CreateEventDto): Promise<TResponse<Event>> {
    const created = await this.eventService.create(payload);
    return {
      message: 'create data event successfully',
      data: created,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOneByID(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<Event>> {
    const Event = await this.eventService.findOneByID(id);
    return {
      message: 'get data event successfully',
      data: Event,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() payload: UpdateEventDto): Promise<TResponse<boolean>> {
    const isUpdated = await this.eventService.update(id, payload);
    return {
      message: 'update data event successfully',
      data: isUpdated,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<TResponse<boolean>> {
    const isDeleted = await this.eventService.remove(id);
    return {
      message: 'delete data event successfully',
      data: isDeleted,
    };
  }

  @Post(':id/media')
  @HttpCode(HttpStatus.CREATED)
  async attachMedia(@Param('id', ParseUUIDPipe) id: string, @Body() request: AttachMediaRequest): Promise<TResponse<EventMedia>> {
    const { mediaId, type } = request;

    if (!mediaId || !type) throw new BadRequestException('mediaId and type are required');

    const eventMedia = await this.eventRepository.attachMedia(id, mediaId, type);

    return {
      message: 'Media attached to event successfully',
      data: eventMedia,
    };
  }
}
