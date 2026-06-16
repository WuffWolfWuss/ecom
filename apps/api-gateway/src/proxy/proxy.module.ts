import { Module } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { ProxyController } from './proxy.controller';
import { SwaggerService } from './swagger';

@Module({
  controllers: [ProxyController],
  providers: [ProxyService, SwaggerService],
})
export class ProxyModule {}
