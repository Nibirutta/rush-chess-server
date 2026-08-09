import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { BullModule } from '@nestjs/bullmq';
import { LOBBY_QUEUES } from '../queues/game-queues.constants';
import { PlayerRepository } from './player.repository';

@Module({
  imports: [
    BullModule.registerQueue({
      name: LOBBY_QUEUES,
    }),
  ],
  controllers: [LobbyController],
  providers: [LobbyGateway, LobbyService, PlayerRepository],
  exports: [],
})
export class LobbyModule {}
