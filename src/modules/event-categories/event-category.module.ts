import { Module } from '@nestjs/common';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { AuthModule } from '../auth/auth.module';
import { EventCategoryController } from './event-category.controller';
import { EventCategoryCacheService } from './event-category-cache.service';
import { eventCategoryProvider } from './event-category.provider';
import { EventCategoryService } from './event-category.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [...eventCategoryProvider, EventCategoryService, CacheService, RedisService, EventCategoryCacheService],
  controllers: [EventCategoryController],
})
export class EventCategoryModule {}
