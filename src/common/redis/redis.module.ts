import { Global, Module } from '@nestjs/common';
import { ChessConfigService } from '../config/chess-config.service';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      inject: [ChessConfigService],
      provide: REDIS_CLIENT,
      useFactory: async (chessConfigService: ChessConfigService) => {
        const redisClient = createClient({
          url: chessConfigService.getRedisURL(),
        });

        await redisClient.connect();

        return redisClient;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class DomainRedisModule {}
