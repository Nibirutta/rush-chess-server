import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { GameModule } from './game/game.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    ChatModule,
    GameModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
