import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CheckInService } from './check-in.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInResponseDto } from './dto/check-in-response.dto';

@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async checkIn(@Body() checkInDto: CheckInDto): Promise<CheckInResponseDto> {
    return this.checkInService.validateTicket(checkInDto.qrCode);
  }
}
