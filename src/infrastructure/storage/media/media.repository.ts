import { Injectable, Inject } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MediaObject } from '../entitiy/media-objects.entity';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { EAccessType } from '../dto/presigned-url.dto';

@Injectable()
export class MediaRepository {
  constructor(@Inject(CONFIG_PROVIDER.PSQL_CONNECTION) private readonly dataSource: DataSource) {}

  getRepository(): Repository<MediaObject> {
    return this.dataSource.getRepository(MediaObject);
  }

  async create(mediaData: Partial<MediaObject>): Promise<MediaObject> {
    const repository = this.getRepository();
    return repository.save(mediaData);
  }

  async findById(id: string): Promise<MediaObject | null> {
    const repository = this.getRepository();
    return repository.findOne({ where: { id } });
  }

  async remove(media: MediaObject): Promise<MediaObject> {
    const repository = this.getRepository();
    return repository.remove(media);
  }

  async findByAccessType(accessType: EAccessType): Promise<MediaObject[]> {
    const repository = this.getRepository();
    return repository.find({ where: { accessType } });
  }
}
