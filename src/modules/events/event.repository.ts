import { Inject, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { REPOSITORY } from '~/common/constants/database';

@Injectable()
export class EventRepository extends Repository<Event> {
  constructor(
    @Inject(REPOSITORY.EVENT)
    readonly repository: Repository<Event>,
  ) {
    super(repository.target, repository.manager, repository.queryRunner);
  }

  findDetailById(id: string) {
    return this.findOne({
      where: { id },
      relations: ['category', 'media', 'media.media', 'tickets'],
    });
  }

  findWithMediaById(id: string) {
    return this.findOne({
      where: { id },
      relations: ['media', 'media.media'],
    });
  }

  findManyByIds(ids: string[]) {
    return this.find({
      where: ids.map((id) => ({ id })),
    });
  }

  async findMissingIds(ids: string[]) {
    const events = await this.findManyByIds(ids);
    const foundIds = new Set(events.map((event) => event.id));

    return ids.filter((id) => !foundIds.has(id));
  }
}
