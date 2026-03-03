import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';
import { PlayerModule } from './player/player.module';
import { TokenModule } from './token/token.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    GameModule,
    PlayerModule,
    TokenModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
