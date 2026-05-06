import { Body, Controller, HttpCode, HttpStatus, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CheckInService } from './check-in.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckInResponse } from './check-in.interface';
import { TResponse } from '~/common/types/response';

@Controller('check-in')
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async checkIn(@Body() checkInDto: CheckInDto): Promise<TResponse<CheckInResponse>> {
    const data = await this.checkInService.validateTicket(checkInDto.qrCode);
    return {
      message: 'ticket validated successfully',
      data,
    };
  }

  @Post('pdf-upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async checkInWithPdf(@UploadedFile() file: Express.Multer.File): Promise<TResponse<CheckInResponse>> {
    if (!file) throw new BadRequestException('No file uploaded');

    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are allowed');

    const data = await this.checkInService.processPdfTicket(file.buffer);
    return {
      message: 'PDF ticket processed and validated successfully',
      data,
    };
  }
}
