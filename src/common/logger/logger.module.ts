import { Module } from '@nestjs/common';
import { LoggerModule as LoggerPinoModule } from 'nestjs-pino';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

@Module({
  imports: [
    LoggerPinoModule.forRootAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.isProduction() ? 'info' : 'debug',
          transport: configService.isDevelopment()
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: false,
                  colorize: true,
                  translateTime: 'HH:MM:ss',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
          customSuccessMessage: (req) => `${req.method} ${req.url} completed`,
          customErrorMessage: (req) => `${req.method} ${req.url} failed`,
          serializers: {
            req: (req) => ({
              method: req.method,
              url: req.url,
              id: req.id,
            }),
            res: (res) => ({
              statusCode: res.statusCode,
              message: res.message,
              responseTime: res.responseTime,
            }),
          },
        },
      }),
    }),
  ],
  exports: [LoggerPinoModule],
})
export class LoggerModule {}
