import { Module } from '@nestjs/common';
import { LobbyModule } from './lobby/lobby.module';
import { ChessModule } from './chess/chess.module';

@Module({
  imports: [LobbyModule, ChessModule],
})
export class GameModule {}
