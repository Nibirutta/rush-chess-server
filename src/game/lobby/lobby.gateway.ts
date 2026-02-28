import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
  WsException,
  WebSocketServer,
} from '@nestjs/websockets';
import { ValidationPipe, UsePipes, UseFilters } from '@nestjs/common';
import { ValidationOptions } from 'src/common/options/validation.options';
import { WsExceptionTransformFilter } from 'src/common/filters/ws-exception-transform.filter';
import { Socket, Server } from 'socket.io';
import { MESSAGES_PATTERN } from '../events/messages.pattern';
import { LobbyService } from './lobby.service';
import { EVENTS_PATTERN } from '../events/events.pattern';
import { SendMessageDTO, IsTypingDTO } from '../dto/messaging.dto';
import { PlayerSocketData } from '../interfaces/socket-data.interface';
import { randomUUID } from 'crypto';
import { InviteResponseDTO, SendInviteDTO } from '../dto/inviting.dto';

@WebSocketGateway({
  namespace: 'lobby',
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(WsExceptionTransformFilter)
export class LobbyGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly lobbyService: LobbyService) {}

  async handleConnection() {
    await this.broadcastOnlinePlayers();
  }

  async handleDisconnect() {
    await this.broadcastOnlinePlayers();
  }

  async broadcastOnlinePlayers() {
    const sockets = await this.server.fetchSockets();
    const onlinePlayers = sockets.map((socket) => ({
      socket_id: socket.id,
      player_data: socket.data as PlayerSocketData,
    }));

    this.server.emit(
      EVENTS_PATTERN.BROADCAST_ONLINE_PLAYERS,
      JSON.stringify(onlinePlayers),
    );
  }

  @SubscribeMessage(MESSAGES_PATTERN.SEND_MESSAGE)
  async sendMessage(
    @MessageBody() sendMessageDTO: SendMessageDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const playerData = client.data as PlayerSocketData;
    const createdMessage = await this.lobbyService.createMessage(
      sendMessageDTO,
      playerData.playerID,
      playerData.nickname,
    );

    this.server.emit(EVENTS_PATTERN.ON_MESSAGE, {
      message: createdMessage.content,
    });
  }

  @SubscribeMessage(MESSAGES_PATTERN.TYPING)
  typing(
    @MessageBody() isTypingDTO: IsTypingDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const isTyping = isTypingDTO.isTyping;
    const playerData = client.data as PlayerSocketData;

    client.broadcast.emit(EVENTS_PATTERN.ON_TYPING, {
      player: playerData.nickname,
      isTyping: isTyping,
    });
  }

  @SubscribeMessage(MESSAGES_PATTERN.INVITE)
  async invite(
    @MessageBody() sendInviteDTO: SendInviteDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const playerData = client.data as PlayerSocketData;
    const onlinePlayers = await this.server.fetchSockets();
    const targetSocket = onlinePlayers.find((skt) => {
      const data = skt.data as PlayerSocketData;

      if (data.nickname === sendInviteDTO.nickname) {
        return true;
      }

      return false;
    });

    if (targetSocket && targetSocket.id !== client.id) {
      const matchID = randomUUID();

      await client.join(matchID);

      this.server.to(targetSocket.id).emit(EVENTS_PATTERN.ON_INVITE, {
        challenger: playerData.nickname,
        matchID: matchID,
      });
    } else {
      throw new WsException('Invalid opponent');
    }
  }

  @SubscribeMessage(MESSAGES_PATTERN.INVITE_RESPONSE)
  async acceptInvite(
    @MessageBody() inviteResponseDTO: InviteResponseDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const playerData = client.data as PlayerSocketData;

    if (inviteResponseDTO.accepted) {
      await client.join(inviteResponseDTO.matchID);

      this.server
        .to(inviteResponseDTO.matchID)
        .emit(EVENTS_PATTERN.ON_INVITE_ACCEPTED, {
          message: `Player ${playerData.nickname} accepted your challenge`,
        });
    } else {
      this.server
        .to(inviteResponseDTO.matchID)
        .emit(EVENTS_PATTERN.ON_INVITE_REFUSED, {
          message: `Player ${playerData.nickname} refused your challenge`,
        });
    }

    this.server.socketsLeave(inviteResponseDTO.matchID);
  }
}
