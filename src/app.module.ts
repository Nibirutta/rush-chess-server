import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  TokenModule,
  DomainEventEmitterModule,
  ChessConfigService,
  DomainRedisModule,
  ChessConfigModule,
} from '@app/common';
import { GameModule } from './game/game.module';
import { PlayerModule } from './player/player.module';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ChessConfigService],
      useFactory: (chessConfigService: ChessConfigService) => ({
        connection: {
          host: chessConfigService.getRedisHost(),
          port: chessConfigService.getRedisPort(),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    ChessConfigModule,
    DomainEventEmitterModule,
    DatabaseModule,
    DomainRedisModule,
    GameModule,
    PlayerModule,
    TokenModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
