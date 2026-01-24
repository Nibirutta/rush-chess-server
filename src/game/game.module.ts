import { Module } from '@nestjs/common';
import { ChessGateway } from './chess/chess.gateway';
import { ChatGateway } from './chat/chat.gateway';
import { ChatService } from './chat/chat.service';

@Module({
  providers: [ChessGateway, ChatGateway, ChatService],
})
export class GameModule {}
