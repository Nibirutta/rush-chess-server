import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
  WsException,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  inviteMap: Map<string, NodeJS.Timeout> = new Map();

  constructor(private readonly lobbyService: LobbyService) {}

  handleConnection(client: Socket) {
    const playerSocketData = client.data as PlayerSocketData;
    this.lobbyService.playerConnected(client.id, playerSocketData);
    this.broadcastOnlinePlayers();
  }

  handleDisconnect(client: Socket) {
    this.lobbyService.playerDisconnected(client.id);
    this.broadcastOnlinePlayers();
  }

  broadcastOnlinePlayers() {
    setTimeout(() => {
      const playersOnline = this.lobbyService.getOnlinePlayers();

      this.server.emit(EVENTS_PATTERN.BROADCAST_ONLINE_PLAYERS, playersOnline);
    }, 50);
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

      const inviteTimeout = setTimeout(() => {
        this.server.to(matchID).emit(EVENTS_PATTERN.ON_INVITE_REFUSED, {
          message: 'Invite timeout',
        });

        this.server.socketsLeave(matchID);
      }, 15000);

      this.inviteMap.set(matchID, inviteTimeout);
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
          message: 'Chess duel is ready to start',
          matchID: inviteResponseDTO.matchID,
        });
    } else {
      this.server
        .to(inviteResponseDTO.matchID)
        .emit(EVENTS_PATTERN.ON_INVITE_REFUSED, {
          message: `Player ${playerData.nickname} refused your challenge`,
        });
    }

    this.server.socketsLeave(inviteResponseDTO.matchID);
    clearTimeout(this.inviteMap.get(inviteResponseDTO.matchID));
    this.inviteMap.delete(inviteResponseDTO.matchID);
  }
}
