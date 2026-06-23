import { Module } from '@nestjs/common';
import {
  DatabaseModule,
  TokenModule,
  DomainEventEmitterModule,
} from '@app/common';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';
import { PlayerModule } from './player/player.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
