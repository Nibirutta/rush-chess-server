import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';
import { PlayerModule } from './player/player.module';
import { TokenModule } from './token/token.module';
import { DomainEventEmitterModule } from './common/event/domain-event-emitter.module';

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
