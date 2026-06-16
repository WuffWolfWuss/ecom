import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser, Public } from '@app/common';
import { Roles } from '@app/common/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('ADMIN', 'CUSTOMER')
  create(@Body() dto: CreateProductDto, @CurrentUser() userId: string) {
    return this.productsService.create(dto, userId);
  }

  @Public()
  @Get()
  findMany(@Query() query: QueryProductDto) {
    return this.productsService.findMany(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @Roles('ADMIN', 'CUSTOMER')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() userId: string,
  ) {
    return this.productsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(204)
  @Roles('ADMIN', 'CUSTOMER')
  remove(@Param('id') id: string, @CurrentUser() userId: string) {
    return this.productsService.remove(id, userId);
  }
}
