import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EventCategoryController } from './event-category.controller';
import { eventCategoryProvider } from './event-category.provider';
import { EventCategoryService } from './event-category.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [...eventCategoryProvider, EventCategoryService],
  controllers: [EventCategoryController],
})
export class EventCategoryModule {}
