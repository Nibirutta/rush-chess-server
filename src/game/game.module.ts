import { Module } from '@nestjs/common';
import { ChessGateway } from './chess/chess.gateway';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  providers: [ChessGateway, ChatGateway],
})
export class GameModule {}
