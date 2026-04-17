import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { CreateEventCategoryDto } from './dto/create-event-category.dto';
import { UpdateEventCategoryDto } from './dto/update-event-category.dto';
import { EventCategory } from './entity/event-category.entity';
import { EventCategoryService } from './event-category.service';

@Controller('event-category')
export class EventCategoryController {
  constructor(private readonly eventCategoryService: EventCategoryService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  async list(@Paginate() query: PaginateQuery): Promise<TResponse<Paginated<EventCategory>>> {
    const paginatedEvents = await this.eventCategoryService.list(query);
    return {
      message: 'get data event category successfully',
      data: paginatedEvents,
    };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() CreateEventCategoryDto: CreateEventCategoryDto): Promise<TResponse<EventCategory>> {
    const created = await this.eventCategoryService.create(CreateEventCategoryDto);
    return {
      message: 'create data event category successfully',
      data: created,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('ids')
  async getIdEvents(): Promise<TResponse<number[]>> {
    const ids = await this.eventCategoryService.getIds();
    return {
      message: 'get data ids event category successfully',
      data: ids,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOneByID(@Param('id') id: number): Promise<TResponse<EventCategory>> {
    const Event = await this.eventCategoryService.findOneByID(id);
    return {
      message: 'get data event category successfully',
      data: Event,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id') id: number, @Body() payload: UpdateEventCategoryDto): Promise<TResponse<EventCategory>> {
    const isUpdated = await this.eventCategoryService.update(id, payload);
    return {
      message: 'update data event category successfully',
      data: isUpdated,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<TResponse<boolean>> {
    const isDeleted = await this.eventCategoryService.remove(id);
    return {
      message: 'delete data event category successfully',
      data: isDeleted,
    };
  }
}
