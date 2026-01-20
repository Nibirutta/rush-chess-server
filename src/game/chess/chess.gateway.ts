import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BaseGateway } from '../base.gateway';

@WebSocketGateway({ namespace: 'chess' })
export class ChessGateway extends BaseGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('testing')
  testing(@MessageBody() data: string) {
    console.log(data);

    return data;
  }
}
