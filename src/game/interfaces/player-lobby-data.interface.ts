import { PlayerSocketData } from 'src/common/interfaces/socket-data.interface';
import { PlayerStatus } from 'src/common/enums/player-status.enum';

export interface PlayerLobbyData extends PlayerSocketData {
  socketID: string;
  status: PlayerStatus;
}
