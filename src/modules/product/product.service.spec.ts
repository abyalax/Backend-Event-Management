import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { REPOSITORY } from '~/common/constants/database';
import { env } from '~/config/env';
import { mockRepository } from '~/test/common/mock';
import { AuthModule } from '../auth/auth.module';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        AuthModule,
        JwtModule.register({
          secret: env.JWT_SECRET,
          privateKey: env.JWT_PRIVATE_KEY,
          publicKey: env.JWT_PUBLIC_KEY,
        }),
      ],
      controllers: [ProductController],
      providers: [
        ProductService,
        {
          provide: REPOSITORY.PRODUCT,
          useValue: mockRepository,
        },
        {
          provide: REPOSITORY.CATEGORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
