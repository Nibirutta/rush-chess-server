import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseGateway } from '../base.gateway';
import { MESSAGES_PATTERN } from '../events/messages.pattern';

@WebSocketGateway({ namespace: 'chess' })
export class ChessGateway extends BaseGateway {
  @SubscribeMessage(MESSAGES_PATTERN.TESTING)
  testing(@MessageBody() data: string, @ConnectedSocket() client: Socket) {
    return data;
  }
}
