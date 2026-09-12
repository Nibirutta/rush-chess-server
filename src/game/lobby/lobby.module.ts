import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';
import { BullModule } from '@nestjs/bullmq';
import { INVITE_QUEUES } from '../queues/game-queues.constants';
import { PlayerRepository } from './player.repository';
import { InviteProcessor } from './invite.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: INVITE_QUEUES,
    }),
  ],
  controllers: [LobbyController],
  providers: [LobbyGateway, LobbyService, PlayerRepository, InviteProcessor],
  exports: [],
})
export class LobbyModule {}
