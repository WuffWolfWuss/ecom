import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongooseConfigFactory = (
  config: ConfigService,
): MongooseModuleOptions => ({
  uri: config.get<string>('MONGO_URI'),
  // Tự reconnect khi mất kết nối
  serverSelectionTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  // Connection pool
  maxPoolSize: config.get<number>('MONGO_POOL_SIZE', 10),
});
