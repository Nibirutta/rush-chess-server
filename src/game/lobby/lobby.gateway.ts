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
import {
  ValidationOptions,
  WsDomainExceptionFilter,
  OnDomainEvents,
  OnInviteExpired,
  OnPlayerStatusChanged,
  DOMAIN_EVENTS_PATTERN,
  PlayerStatus,
  LOBBY_EVENTS,
  LOBBY_MESSAGES,
  OnFinishedMatch,
  BaseSocket,
  LobbyNamespace,
} from '@app/common';
import { Server } from 'socket.io';
import { LobbyService } from './lobby.service';
import { SendMessageDTO } from '../dto/message.dto';
import { InviteResponseDTO, SendInviteDTO } from '../dto/invite.dto';
import { SetPlayerStatusDTO } from '../dto/lobby.dto';

@WebSocketGateway({
  namespace: LobbyNamespace,
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class LobbyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(private readonly lobbyService: LobbyService) {}

  // On connection events

  private async broadcastOnlinePlayers(): Promise<void> {
    const playersOnline = await this.lobbyService.getOnlinePlayers();

    this.server.emit(LOBBY_EVENTS.ONLINE_PLAYERS, playersOnline);
  }

  async handleConnection(client: BaseSocket): Promise<void> {
    const { playerID } = client.data;
    const socketID = client.id;

    await this.lobbyService.playerConnected(playerID, socketID);
    await this.broadcastOnlinePlayers();
  }

  async handleDisconnect(client: BaseSocket): Promise<void> {
    const { playerID } = client.data;

    await this.lobbyService.playerDisconnected(playerID);
    await this.broadcastOnlinePlayers();
  }

  // Messages

  @SubscribeMessage(LOBBY_MESSAGES.SEND_MESSAGE)
  async sendMessage(
    @MessageBody() sendMessageDTO: SendMessageDTO,
    @ConnectedSocket() client: BaseSocket,
  ): Promise<void> {
    const { content } = sendMessageDTO;
    const { playerID } = client.data;

    const newMessage = await this.lobbyService.createMessage(content, playerID);

    if (newMessage) {
      this.server.emit(LOBBY_EVENTS.MESSAGE, {
        message: newMessage,
      });
    }
  }

  // Invite

  @SubscribeMessage(LOBBY_MESSAGES.SEND_INVITE)
  async invite(
    @MessageBody() sendInviteDTO: SendInviteDTO,
    @ConnectedSocket() client: BaseSocket,
  ): Promise<void> {
    const { playerID } = client.data;
    const socketID = client.id;
    const { opponentID } = sendInviteDTO;

    const inviteTicket = await this.lobbyService.invite(playerID, opponentID);

    if (inviteTicket) {
      const inviteRoom = inviteTicket.inviteID;

      this.server
        .to([socketID, inviteTicket.opponentSocketID])
        .socketsJoin(inviteRoom);

      client.to(inviteTicket.opponentSocketID).emit(LOBBY_EVENTS.INVITE, {
        inviteID: inviteTicket.inviteID,
        challenger: inviteTicket.challengerNickname,
      });
    }
  }

  @SubscribeMessage(LOBBY_MESSAGES.INVITE_RESPONSE)
  async acceptInvite(
    @MessageBody() inviteResponseDTO: InviteResponseDTO,
  ): Promise<void> {
    const { inviteID, accepted } = inviteResponseDTO;
    const inviteRoom = inviteID;

    try {
      if (accepted) {
        this.server.in(inviteRoom).emit(LOBBY_EVENTS.INVITE_ACCEPTED, {
          matchID: inviteID,
        });
      } else {
        this.server.in(inviteRoom).emit(LOBBY_EVENTS.INVITE_NOT_ACCEPTED);
      }

      await this.lobbyService.resolveInvite(inviteID, accepted);
    } finally {
      this.server.socketsLeave(inviteRoom);
    }
  }

  // Player

  @SubscribeMessage(LOBBY_MESSAGES.SET_PLAYER_STATUS)
  async setPlayerStatus(
    @ConnectedSocket() client: BaseSocket,
    @MessageBody() setPlayerStatusDTO: SetPlayerStatusDTO,
  ): Promise<void> {
    const { playerID } = client.data;
    const { ready } = setPlayerStatusDTO;

    await this.lobbyService.setPlayerStatus(playerID, ready);
  }

  // Domain Events

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED)
  inviteExpired(payload: OnInviteExpired): void {
    const inviteRoom = payload.inviteID;

    this.server.to(inviteRoom).emit(LOBBY_EVENTS.INVITE_EXPIRED, {
      message: 'Invite expired',
    });

    this.server.socketsLeave(inviteRoom);
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH)
  async updatePlayerStatusAfterMatch(payload: OnFinishedMatch): Promise<void> {
    const players = payload.playerIDs;

    for (let i = 0; i < players.length; i++) {
      await this.lobbyService.changePlayerStatus(
        players[i],
        PlayerStatus.Ready,
      );
    }
  }

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED)
  playerStatusChanged(payload: OnPlayerStatusChanged): void {
    this.server.emit(LOBBY_EVENTS.PLAYER_UPDATE, payload);
  }
}
