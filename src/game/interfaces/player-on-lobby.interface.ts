import { PlayerSocketData } from 'src/common/interfaces/socket-data.interface';

export enum PlayerLobbyStatus {
  Ready = 'READY',
  Not_Ready = 'NOT_READY',
  Awaiting = 'AWAITING',
  On_Battle = 'ON_BATTLE',
}

export interface PlayerLobbyInfo extends PlayerSocketData {
  socketID: string;
  status: PlayerLobbyStatus;
}
