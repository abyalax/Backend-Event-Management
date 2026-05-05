import { Module } from '@nestjs/common';
import { QRService } from './qr-code.service';
import { QrCodeController } from './qr-code.controller';
import { qrCodeProvider } from './qr-code.provider';

@Module({
  controllers: [QrCodeController],
  providers: qrCodeProvider,
  exports: [QRService],
})
export class QrModule {}
