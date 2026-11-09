import { NestFactory, Reflector } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { InternalAuthGuard, RolesGuard } from '@app/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app: INestApplication<any> = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalGuards(
    new InternalAuthGuard(app.get(Reflector), app.get(ConfigService)),
    new RolesGuard(app.get(Reflector)),
  );

  const config = new DocumentBuilder()
    .setTitle('User Service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`User service running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
