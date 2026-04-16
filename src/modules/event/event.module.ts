import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { EventController } from './event.controller';
import { eventProvider } from './event.provider';
import { EventService } from './event.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [...eventProvider, EventService],
  controllers: [EventController],
})
export class EventModule {}
