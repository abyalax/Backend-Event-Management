import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { QRService } from './qr-code.service';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { RevokeQrDto } from './dto/revoke-qr.dto';

@Controller('qr')
export class QrCodeController {
  constructor(private readonly qrService: QRService) {}

  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  async generateQrCode(@Body() generateQrDto: GenerateQrDto): Promise<{ qrCode: string }> {
    const qrCode = await this.qrService.generate(generateQrDto.ticketId, generateQrDto.eventId);
    return { qrCode };
  }

  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revokeQrCode(@Body() revokeQrDto: RevokeQrDto): Promise<{ revoked: boolean }> {
    const result = this.qrService.revoke(revokeQrDto.qrCode);
    return {
      revoked: result.revoked,
    };
  }
}
