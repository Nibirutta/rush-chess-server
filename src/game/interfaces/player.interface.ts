import { PlayerStatus } from '@app/common';

export interface OnlinePlayerData {
  playerID: string;
  socketID: string;
  nickname: string;
  status: PlayerStatus;
}
