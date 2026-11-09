import { BrokerModule } from '@app/broker';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ProductsHandler } from './messaging/handlers/products.handler';
import { ProductsPublisher } from './messaging/publishers/products.publisher';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './repositories/products.repository';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    ElasticsearchModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        node: config.get('ELASTICSEARCH_NODE', 'http://localhost:9200'),
      }),
    }),
    BrokerModule,
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsRepository,
    ProductsHandler,
    ProductsPublisher,
  ],
})
export class ProductsModule {}
