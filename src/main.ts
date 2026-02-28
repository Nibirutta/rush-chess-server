import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { corsOptions } from './configCors';
import * as cookieParser from 'cookie-parser';
import { ValidationOptions } from './common/options/validation.options';
import { ValidationPipe } from '@nestjs/common';
import { SocketAuthenticatedAdapter } from './socket-authenticated.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(corsOptions);
  app.use(cookieParser());
  app.useWebSocketAdapter(new SocketAuthenticatedAdapter(app));
  app.useGlobalPipes(new ValidationPipe(ValidationOptions));

  await app.listen(process.env.PORT ?? 3000);
}
// eslint-disable-next-line
bootstrap();
