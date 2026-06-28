import { ConfigModule } from '@nestjs/config';
import { Global, Module } from '@nestjs/common';
import * as joi from 'joi';
import { ChessConfigService } from './chess-config.service';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: joi.object({
        PORT: joi.number().default(3000),
        DATABASE_URL: joi.string().required(),
        REDIS_URL: joi.string().required(),
        ACCESS_TOKEN_SECRET: joi.string().required(),
        SESSION_TOKEN_SECRET: joi.string().required(),
        RESET_TOKEN_SECRET: joi.string().required(),
        ORIGINS: joi.string().required(),
      }),
    }),
  ],
  controllers: [],
  providers: [ChessConfigService],
  exports: [ChessConfigService],
})
export class ChessConfigModule {}
