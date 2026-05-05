import { Controller, Get, Post, Delete, Param, Body, Request, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import { EventReminder } from './entities/event-reminder.entity';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { JwtGuard } from '~/common/guards/jwt.guard';
import '~/common/types/global';

@UseGuards(JwtGuard)
@Controller('reminders')
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createReminder(@Body() body: CreateReminderDto, @Request() req: Request): Promise<EventReminder> {
    return this.reminderService.createReminder(body, req.user.id);
  }

  @Get('my-reminders')
  async getUserReminders(@Request() req: Request): Promise<EventReminder[]> {
    return this.reminderService.getUserReminders(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelReminder(@Param('id') id: string): Promise<void> {
    await this.reminderService.cancelReminder(id);
  }

  @Post('order/:orderId/schedule')
  @HttpCode(HttpStatus.CREATED)
  async scheduleRemindersForOrder(
    @Param('orderId') orderId: string,
    @Body() body: { eventId: string; reminderTimes?: string[] },
    @Request() req: Request,
  ): Promise<void> {
    await this.reminderService.scheduleRemindersForOrder(orderId, body.eventId, req.user.id, body.reminderTimes);
  }

  @Delete('order/:orderId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelRemindersForOrder(@Param('orderId') orderId: string): Promise<void> {
    await this.reminderService.cancelRemindersForOrder(orderId);
  }

  @Post('process')
  @HttpCode(HttpStatus.OK)
  async processOverdueReminders(): Promise<{ message: string; processed: number }> {
    await this.reminderService.processOverdueReminders();
    return { message: 'Reminders processed', processed: 0 };
  }
}
