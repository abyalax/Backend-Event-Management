import { Global, Module } from '@nestjs/common';
import { CONFIG_SERVICE, ConfigProvider, ENV, EnvProvider } from './config.provider';

@Global()
@Module({
  providers: [EnvProvider, ConfigProvider],
  exports: [CONFIG_SERVICE, ENV, ConfigProvider, EnvProvider],
})
export class ConfigModule {}
