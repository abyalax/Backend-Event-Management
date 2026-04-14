/** biome-ignore-all lint/complexity/noStaticOnlyClass: <> */
import { DynamicModule, Module } from '@nestjs/common';
import { DataSourceOptions } from 'typeorm';
import { createDatabaseProviders, PostgreeConnection } from './database.provider';

@Module({
  providers: [PostgreeConnection],
  exports: [PostgreeConnection],
})
export class DatabaseModule {
  static forRoot(provide: string, options: DataSourceOptions): DynamicModule {
    const providers = createDatabaseProviders(provide, options);
    return {
      module: DatabaseModule,
      providers: providers,
      exports: providers,
    };
  }
}
