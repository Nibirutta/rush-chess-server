import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { BaseGateway } from '../base.gateway';
import { MESSAGES_PATTERN } from '../events/messages.pattern';

@WebSocketGateway({ namespace: 'chess' })
export class ChessGateway extends BaseGateway {
  @SubscribeMessage(MESSAGES_PATTERN.TESTING)
  testing(@MessageBody() data: string) {
    return data;
  }
}
