import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';
import { DomainRedisService } from './domain-redis.service';
import { ChessConfigService } from '../config/chess-config.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ChessConfigService],
      useFactory: (chessConfigService: ChessConfigService) => ({
        stores: [createKeyv(chessConfigService.getRedisURL())],
      }),
    }),
  ],
  providers: [DomainRedisService],
  exports: [DomainRedisService],
})
export class DomainRedisModule {}
