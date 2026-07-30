import { Socket } from 'socket.io';

export interface BaseSocketData {
  playerID: string;
}

export type BaseSocket = Socket<any, any, any, BaseSocketData>;
