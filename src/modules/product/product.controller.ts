import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '~/common/decorators/roles.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { RolesGuard } from '~/common/guards/roles.guard';
import { Paginated } from '~/common/types/meta';
import { TResponse } from '~/common/types/response';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from './entity/category.entity';
import { Product } from './entity/product.entity';
import { ProductService } from './product.service';

@UseGuards(AuthGuard, JwtGuard, RolesGuard)
@Roles('Cashier', 'Admin')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @HttpCode(HttpStatus.OK)
  @Get('')
  async find(@Query() query: QueryProductDto): Promise<TResponse<Paginated<Product>>> {
    const products = await this.productService.find(query);
    return {
      statusCode: HttpStatus.OK,
      data: products,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('/search/name')
  async searchByName(@Query() query: { search: string }): Promise<TResponse<Product[]>> {
    const products = await this.productService.searchByName(query);
    return {
      statusCode: HttpStatus.OK,
      data: products,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('categories')
  async getCategories(): Promise<TResponse<Category[]>> {
    const data = await this.productService.getCategories();
    return {
      statusCode: HttpStatus.OK,
      data,
    };
  }

  // TODO: Create inventories to when create product
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() CreateProductDto: CreateProductDto): Promise<TResponse<Product>> {
    const product = await this.productService.create(CreateProductDto);
    return {
      statusCode: HttpStatus.CREATED,
      data: product,
    };
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('/categories')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto): Promise<TResponse<Category>> {
    const data = await this.productService.createCategory(createCategoryDto);
    return {
      statusCode: HttpStatus.CREATED,
      data: data,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get('ids')
  async getIdProducts(): Promise<TResponse<number[]>> {
    const ids = await this.productService.getIds();
    return {
      statusCode: HttpStatus.OK,
      data: ids,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOneByID(@Param('id') id: string): Promise<TResponse<Product>> {
    const product = await this.productService.findOneByID(Number(id));
    return {
      statusCode: HttpStatus.OK,
      data: product,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch(':id')
  async update(@Param('id') id: number, @Body() payload: UpdateProductDto): Promise<TResponse<boolean>> {
    const isUpdated = await this.productService.update(id, payload);
    return {
      statusCode: HttpStatus.NO_CONTENT,
      data: isUpdated,
    };
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Param('id') id: number): Promise<TResponse<boolean>> {
    const isDeleted = await this.productService.remove(id);
    return {
      statusCode: HttpStatus.NO_CONTENT,
      data: isDeleted,
    };
  }
}
