import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { OrderModule } from '../orders/order.module';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { TicketController } from './ticket.controller';
import { eventProvider } from './ticket.provider';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    forwardRef(() => OrderModule),
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
      }),
    }),
  ],
  providers: eventProvider,
  controllers: [TicketController],
  exports: [...eventProvider],
})
export class TicketModule {}
