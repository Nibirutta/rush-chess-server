import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { BaseGateway } from '../base.gateway';
import { MESSAGES_PATTERN } from '../events/messages.pattern';
import { ChatService } from './chat.service';
import { TokenService } from 'src/token/token.service';
import { EVENTS_PATTERN } from '../events/events.pattern';
import { SendMessageDTO } from '../dto/send-message.dto';
import { PlayerSocketData } from '../interfaces/socket-data.interface';

@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway extends BaseGateway {
  constructor(
    private readonly chatService: ChatService,
    tokenService: TokenService
  ) {
    super(tokenService);
  }

  @SubscribeMessage(MESSAGES_PATTERN.SEND_MESSAGE)
  async sendMessage(@MessageBody() sendMessageDTO: SendMessageDTO, @ConnectedSocket() client: Socket) {
    const playerData: PlayerSocketData = client.data;
    const createdMessage = await this.chatService.createMessage(sendMessageDTO, playerData.playerID, playerData.nickname);

    this.server.emit(EVENTS_PATTERN.ON_MESSAGE, createdMessage.content);

    return createdMessage;
  }
}
