import { PlayerSocketData, PlayerStatus } from '@app/common';

export interface PlayerLobbyData extends PlayerSocketData {
  socketID: string;
  status: PlayerStatus;
}
