import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ChessModule } from './chess/chess.module';

@Module({
  imports: [ChatModule, ChessModule]
})
export class GameModule {}
