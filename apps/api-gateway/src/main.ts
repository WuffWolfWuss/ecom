import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { SwaggerService } from './proxy/swagger';
import { SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Gateway');

  app.enableCors();

  const aggregator = app.get(SwaggerService);
  await aggregator.buildMergedDoc();
  const doc = aggregator.getDoc();
  console.log('Merged doc paths:', Object.keys(doc?.paths || {}));

  // Setup Swagger UI với custom endpoint
  SwaggerModule.setup('docs', app, doc, {
    jsonDocumentUrl: 'docs-json', // override url swagger dùng để fetch JSON
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`API Gateway running on http://localhost:${port}`);
  logger.log(`Swagger UI:   http://localhost:${port}/docs`);
}
bootstrap();
