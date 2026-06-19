import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfigFactory = (
  config: ConfigService,
  entities: Function[],
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('DB_HOST', 'localhost'),
  port: config.get<number>('DB_PORT', 5432),
  username: config.get('DB_USER'),
  password: config.get('DB_PASS'),
  database: config.get('DB_NAME'),
  entities,
  synchronize: config.get('NODE_ENV') !== 'production',
  ssl: config.get('DB_SSL') === 'true' ? { rejectUnauthorized: false } : false,
  extra: {
    max: 10, // connection pool size
    idleTimeoutMillis: 30000,
  },
});
