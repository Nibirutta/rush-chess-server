import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  TokenModule,
  DomainEventEmitterModule,
} from '@app/common';
import { GameModule } from './game/game.module';
import { PlayerModule } from './player/player.module';
import { DomainRedisModule } from './common/redis/domain-redis.module';
import { ChessConfigModule } from './common/config/chess-config.module';

@Module({
  imports: [
    ChessConfigModule,
    DomainRedisModule,
    DomainEventEmitterModule,
    DatabaseModule,
    GameModule,
    PlayerModule,
    TokenModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
