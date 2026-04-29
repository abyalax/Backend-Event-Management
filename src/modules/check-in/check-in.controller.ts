/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInResponseDto } from './dto/check-in-response.dto';
import { TResponse } from '~/common/types/response';

@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async checkIn(@Body() checkInDto: CheckInDto): Promise<TResponse<CheckInResponseDto>> {
    const result = await this.checkInService.validateTicket(checkInDto.qr);
    return {
      message: 'Ticket validation completed',
      data: result,
    };
  }
}
