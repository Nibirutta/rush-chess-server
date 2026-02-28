import { Module } from '@nestjs/common';
import { LobbyGateway } from './lobby.gateway';
import { LobbyService } from './lobby.service';
import { LobbyController } from './lobby.controller';

@Module({
  imports: [],
  controllers: [LobbyController],
  providers: [LobbyGateway, LobbyService],
  exports: [],
})
export class LobbyModule {}
