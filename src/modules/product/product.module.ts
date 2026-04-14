import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthModule } from '../auth/auth.module';
import { ProductController } from './product.controller';
import { productProvider } from './product.provider';
import { ProductService } from './product.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [...productProvider, ProductService],
  controllers: [ProductController],
})
export class ProductModule {}
