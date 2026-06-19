import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { BrokerModule } from '@app/broker';
import { mongooseConfigFactory } from '@app/database';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/product-service/.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: mongooseConfigFactory,
    }),
    HealthModule.forRoot({ database: 'mongo' }),
    ProductsModule,
    CategoriesModule,
    BrokerModule,
  ],
})
export class AppModule {}
