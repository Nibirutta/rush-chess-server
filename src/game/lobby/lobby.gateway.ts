import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { ValidationPipe, UsePipes, UseFilters } from '@nestjs/common';
import { ValidationOptions } from 'src/common/options/validation.options';
import { Socket, Server } from 'socket.io';
import { MESSAGES_PATTERN } from '../events/messages.pattern';
import { LobbyService } from './lobby.service';
import {
  PLAYER_EVENTS_PATTERN,
  INVITE_EVENTS_PATTERN,
  MESSAGE_EVENTS_PATTERN,
} from '../events/events.pattern';
import { SendMessageDTO, IsTypingDTO } from '../dto/message.dto';
import { PlayerSocketData } from '../../common/interfaces/socket-data.interface';
import {
  InviteResponseDTO,
  OnInviteExpired,
  SendInviteDTO,
} from '../dto/invite.dto';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IsPlayerReadyDTO,
  OnPlayerStatusChanged,
} from '../dto/player-on-lobby.dto';
import { WsDomainExceptionFilter } from 'src/common/filters/ws-domain-exception.filter';

@WebSocketGateway({
  namespace: 'lobby',
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly lobbyService: LobbyService) {}

  handleConnection(client: Socket) {
    const playerSocketData = client.data as PlayerSocketData;
    this.lobbyService.playerConnected(playerSocketData, client.id);
    this.broadcastOnlinePlayers();
  }

  handleDisconnect(client: Socket) {
    const playerSocketData = client.data as PlayerSocketData;
    this.lobbyService.playerDisconnected(playerSocketData);
    this.broadcastOnlinePlayers();
  }

  broadcastOnlinePlayers() {
    setTimeout(() => {
      const playersOnline = this.lobbyService.getOnlinePlayers();

      this.server.emit(
        PLAYER_EVENTS_PATTERN.BROADCAST_ONLINE_PLAYERS,
        playersOnline,
      );
    }, 50); // Added 50 miliseconds because of race conditions, must be executed only after connection
  }

  // Messages

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

    this.server.emit(MESSAGE_EVENTS_PATTERN.ON_MESSAGE, {
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

    client.broadcast.emit(MESSAGE_EVENTS_PATTERN.ON_TYPING, {
      player: playerData.nickname,
      isTyping: isTyping,
    });
  }

  @SubscribeMessage(MESSAGES_PATTERN.INVITE)
  invite(
    @MessageBody() sendInviteDTO: SendInviteDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const challengerData = client.data as PlayerSocketData;

    const inviteTicket = this.lobbyService.invite(
      challengerData.playerID,
      sendInviteDTO.opponentID,
    );

    this.server
      .in([client.id, inviteTicket.opponentSocketID])
      .socketsJoin(inviteTicket.waitRoomID);

    client.to(inviteTicket.waitRoomID).emit(INVITE_EVENTS_PATTERN.ON_INVITE, {
      challenger: challengerData.nickname,
      waitRoomID: inviteTicket.waitRoomID,
    });
  }

  @SubscribeMessage(MESSAGES_PATTERN.INVITE_RESPONSE)
  acceptInvite(@MessageBody() inviteResponseDTO: InviteResponseDTO) {
    try {
      if (inviteResponseDTO.accepted) {
        this.server
          .to(inviteResponseDTO.waitRoomID)
          .emit(INVITE_EVENTS_PATTERN.ON_INVITE_ACCEPTED, {
            message: 'Chess duel is ready to start',
            duelRoomID: inviteResponseDTO.waitRoomID,
          });
      } else {
        this.server
          .to(inviteResponseDTO.waitRoomID)
          .emit(INVITE_EVENTS_PATTERN.ON_INVITE_REFUSED, {
            message: `Challenge refused`,
          });
      }

      this.lobbyService.resolveInvite(
        inviteResponseDTO.waitRoomID,
        inviteResponseDTO.accepted,
      );
    } finally {
      this.server.socketsLeave(inviteResponseDTO.waitRoomID);
    }
  }

  @SubscribeMessage(MESSAGES_PATTERN.IS_READY)
  isPlayerReady(@MessageBody() isPlayerReadyDTO: IsPlayerReadyDTO) {
    this.lobbyService.isPlayerReady(
      isPlayerReadyDTO.playerID,
      isPlayerReadyDTO.ready,
    );
  }

  // Events

  @OnEvent(INVITE_EVENTS_PATTERN.ON_INVITE_EXPIRED)
  inviteExpired(payload: OnInviteExpired) {
    this.server
      .to(payload.waitRoomID)
      .emit(INVITE_EVENTS_PATTERN.ON_INVITE_EXPIRED, {
        message: 'Invite expired',
      });

    this.server.socketsLeave(payload.waitRoomID);
  }

  @OnEvent(PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED)
  playerStatusChanged(payload: OnPlayerStatusChanged) {
    this.server.emit(PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED, payload);
  }
}
