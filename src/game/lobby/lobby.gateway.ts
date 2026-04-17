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
import {
  INCOMING_MESSAGES,
  OUTGOING_MESSAGES,
} from '../messages/messages.pattern';
import { LobbyService } from './lobby.service';
import { SendMessageDTO, IsTypingDTO } from '../dto/message.dto';
import { PlayerSocketData } from '../../common/interfaces/socket-data.interface';
import { InviteResponseDTO, SendInviteDTO } from '../dto/invite.dto';
import { IsPlayerReadyDTO } from '../dto/lobby.dto';
import { WsDomainExceptionFilter } from 'src/common/filters/ws-domain-exception.filter';
import { OnDomainEvents } from 'src/common/event/on-domain-events.decorator';
import {
  OnInviteExpired,
  OnMatchTerminated,
  OnPlayerStatusChanged,
} from 'src/common/event/domain.events';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';
import { PlayerStatus } from 'src/common/enums/player-status.enum';

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

      this.server.emit(OUTGOING_MESSAGES.NOTIFY_ONLINE_PLAYERS, playersOnline);
    }, 50); // Added 50 miliseconds because of race conditions, must be executed only after connection
  }

  // Messages

  @SubscribeMessage(INCOMING_MESSAGES.SEND_MESSAGE)
  async sendMessage(
    @MessageBody() sendMessageDTO: SendMessageDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const playerData = client.data as PlayerSocketData;
    const createdMessage = await this.lobbyService.createMessage(
      sendMessageDTO,
      playerData.ID,
      playerData.nickname,
    );

    this.server.emit(OUTGOING_MESSAGES.NOTIFY_MESSAGE, {
      message: createdMessage.content,
    });
  }

  @SubscribeMessage(INCOMING_MESSAGES.IS_PLAYER_TYPING)
  typing(
    @MessageBody() isTypingDTO: IsTypingDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const isTyping = isTypingDTO.isTyping;
    const playerData = client.data as PlayerSocketData;

    client.broadcast.emit(OUTGOING_MESSAGES.NOTIFY_TYPING, {
      player: playerData.nickname,
      isTyping: isTyping,
    });
  }

  @SubscribeMessage(INCOMING_MESSAGES.SEND_INVITATION)
  invite(
    @MessageBody() sendInviteDTO: SendInviteDTO,
    @ConnectedSocket() client: Socket,
  ) {
    const challengerData = client.data as PlayerSocketData;
    const challengerSocketID = client.id;

    const inviteTicket = this.lobbyService.invite(
      challengerData.ID,
      sendInviteDTO.opponentID,
    );

    this.server
      .in([challengerSocketID, inviteTicket.opponentSocketID])
      .socketsJoin(inviteTicket.waitRoomID);

    client.to(inviteTicket.waitRoomID).emit(OUTGOING_MESSAGES.NOTIFY_INVITE, {
      challenger: challengerData.nickname,
      waitRoomID: inviteTicket.waitRoomID,
    });
  }

  @SubscribeMessage(INCOMING_MESSAGES.RESPONSE_TO_INVITE)
  acceptInvite(@MessageBody() inviteResponseDTO: InviteResponseDTO) {
    try {
      if (inviteResponseDTO.accepted) {
        this.server
          .to(inviteResponseDTO.waitRoomID)
          .emit(OUTGOING_MESSAGES.NOTIFY_INVITE_ACCEPTED, {
            duelRoomID: inviteResponseDTO.waitRoomID,
          });
      } else {
        this.server
          .to(inviteResponseDTO.waitRoomID)
          .emit(OUTGOING_MESSAGES.NOTIFY_INVITE_NOT_ACCEPTED);
      }

      this.lobbyService.resolveInvite(
        inviteResponseDTO.waitRoomID,
        inviteResponseDTO.accepted,
      );
    } finally {
      this.server.socketsLeave(inviteResponseDTO.waitRoomID);
    }
  }

  @SubscribeMessage(INCOMING_MESSAGES.IS_READY)
  isPlayerReady(@MessageBody() isPlayerReadyDTO: IsPlayerReadyDTO) {
    this.lobbyService.isPlayerReady(
      isPlayerReadyDTO.playerID,
      isPlayerReadyDTO.ready,
    );
  }

  // Events

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED)
  inviteExpired(payload: OnInviteExpired) {
    this.server
      .to(payload.waitRoomID)
      .emit(OUTGOING_MESSAGES.NOTIFY_INVITE_EXPIRED, {
        message: 'Invite expired',
      });

    this.server.socketsLeave(payload.waitRoomID);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED)
  returnToLobbyAfterMatch(payload: OnMatchTerminated) {
    payload.playersInMatch.forEach((player) => {
      this.lobbyService.changePlayerStatus(player, PlayerStatus.Ready);
    });
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED)
  playerStatusChanged(payload: OnPlayerStatusChanged) {
    this.server.emit(OUTGOING_MESSAGES.NOTIFY_PLAYER_UPDATE, payload);
  }
}
