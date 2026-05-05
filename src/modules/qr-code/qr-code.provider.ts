import { Provider } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { QRService } from './qr-code.service';

export const qrCodeProvider: Provider[] = [
  PinoLogger,
  QRService,
  {
    inject: [CONFIG_SERVICE],
    provide: CONFIG_PROVIDER.QR,
    useFactory: (configService: ConfigService) => ({
      secret: configService.get('QR_SECRET'),
    }),
  },
];
