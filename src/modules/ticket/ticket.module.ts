import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { TicketController } from './ticket.controller';
import { eventProvider } from './ticket.provider';
import { TicketService } from './ticket.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [...eventProvider, TicketService],
  controllers: [TicketController],
})
export class TicketModule {}
