import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BrokerModule } from '@app/broker';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/product-service/.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
        'mongodb://ecom_user:ecom_pass@localhost:27017/ecom_products?authSource=admin',
    ),
    ProductsModule,
    CategoriesModule,
    BrokerModule,
  ],
})
export class AppModule {}
