import { Module } from '@nestjs/common';
import { QRService } from './qr-code.service';
import { QrCodeController } from './qr-code.controller';

@Module({
  controllers: [QrCodeController],
  providers: [QRService],
  exports: [QRService],
})
export class QrModule {}
