import { NestFactory, Reflector } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { InternalAuthGuard, RolesGuard } from '@app/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app: INestApplication<any> = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // graceful shutdown

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(
    new InternalAuthGuard(app.get(Reflector), app.get(ConfigService)),
    new RolesGuard(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('Order Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  console.log(`User service running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
