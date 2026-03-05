import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';
import { PlayerLobbyStatus } from '../interfaces/player-on-lobby.interface';

export class IsPlayerReadyDTO {
  @IsNotEmpty()
  @IsString()
  playerID: string;

  @IsNotEmpty()
  @IsBoolean()
  ready: boolean;
}

// Do not require validation

export class OnPlayerStatusChanged {
  playerID: string;
  status: PlayerLobbyStatus;

  constructor(playerID: string, status: PlayerLobbyStatus) {
    this.playerID = playerID;
    this.status = status;
  }
}
