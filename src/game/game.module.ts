import { Module } from '@nestjs/common';
import { LobbyModule } from './lobby/lobby.module';
import { MatchModule } from './chess/match.module';

@Module({
  imports: [LobbyModule, MatchModule],
})
export class GameModule {}
