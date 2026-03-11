import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { SendMessageDTO } from '../dto/message.dto';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';
import { PlayerSocketData } from '../../common/interfaces/socket-data.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  INVITE_EVENTS_PATTERN,
  PLAYER_EVENTS_PATTERN,
} from '../events/events.pattern';
import { InviteTicket, OnInviteExpired } from '../dto/invite.dto';
import { InviteSession } from '../interfaces/invite.interface';
import {
  PlayerLobbyInfo,
  PlayerLobbyStatus,
} from '../interfaces/player-on-lobby.interface';
import { OnPlayerStatusChanged } from '../dto/player-on-lobby.dto';
import {
  InvalidOpponentError,
  PlayerNotFoundError,
  SessionNotFoundError,
} from 'src/common/errors/lobby.errors';

@Injectable()
export class LobbyService {
  private onlinePlayers: Map<string, PlayerLobbyInfo> = new Map();
  private inviteMapping: Map<string, InviteSession> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  playerConnected(playerSocketData: PlayerSocketData, socketID: string) {
    this.onlinePlayers.set(playerSocketData.playerID, {
      playerID: playerSocketData.playerID,
      nickname: playerSocketData.nickname,
      socketID: socketID,
      status: PlayerLobbyStatus.Ready,
    });
  }

  playerDisconnected(playerSocketData: PlayerSocketData) {
    this.onlinePlayers.delete(playerSocketData.playerID);
  }

  getOnlinePlayers(): Array<PlayerLobbyInfo> {
    return Array.from(this.onlinePlayers.values());
  }

  async getMessages(paginationPropertiesDTO: PaginationPropertiesDTO) {
    const messages = await this.databaseService.message.findMany({
      skip: paginationPropertiesDTO.skip,
      take: paginationPropertiesDTO.amount,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages.map((message) => message.content);
  }

  async createMessage(
    sendMessageDTO: SendMessageDTO,
    playerID: string,
    nickname: string,
  ) {
    const formatedMessage = this.formatMessage(
      sendMessageDTO.content,
      nickname,
    );
    const messageData: Prisma.MessageCreateInput = {
      content: formatedMessage,
      player: {
        connect: {
          id: playerID,
        },
      },
    };

    return this.databaseService.message.create({ data: messageData });
  }

  private formatMessage(message: string, nickname: string) {
    // eslint-disable-next-line
    const messageContent: string = `[${nickname}] - ${message.replaceAll(/[\[\]]/g, '')}`;

    return messageContent;
  }

  invite(challengerID: string, opponentID: string) {
    const foundOpponent = this.onlinePlayers.get(opponentID);

    if (!foundOpponent) throw new PlayerNotFoundError('Opponent not found');
    if (
      challengerID === opponentID ||
      foundOpponent.status !== PlayerLobbyStatus.Ready
    )
      throw new InvalidOpponentError(
        'Opponent is not ready or is not currently online',
      );

    const waitRoomID = randomUUID().toString();
    const inviteExpirationTimeout = setTimeout(() => {
      this.changePlayerStatus(challengerID, PlayerLobbyStatus.Ready);
      this.changePlayerStatus(opponentID, PlayerLobbyStatus.Ready);

      this.eventEmitter.emit(
        INVITE_EVENTS_PATTERN.ON_INVITE_EXPIRED,
        new OnInviteExpired(waitRoomID),
      );
    }, 15000);

    this.inviteMapping.set(waitRoomID, {
      timeout: inviteExpirationTimeout,
      challengerID: challengerID,
      opponentID: opponentID,
    });

    this.changePlayerStatus(challengerID, PlayerLobbyStatus.Awaiting);
    this.changePlayerStatus(opponentID, PlayerLobbyStatus.Awaiting);

    return new InviteTicket(waitRoomID, foundOpponent.socketID);
  }

  playerReady(playerID: string, ready: boolean) {
    if (ready) {
      this.changePlayerStatus(playerID, PlayerLobbyStatus.Ready);
    } else {
      this.changePlayerStatus(playerID, PlayerLobbyStatus.Not_Ready);
    }
  }

  changePlayerStatus(playerID: string, status: PlayerLobbyStatus) {
    const foundPlayer = this.onlinePlayers.get(playerID);

    if (!foundPlayer) return;
    if (foundPlayer.status === status) return;

    foundPlayer.status = status;

    this.eventEmitter.emit(
      PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
      new OnPlayerStatusChanged(playerID, status),
    );
  }

  resolveInvite(waitRoomID: string, accepted: boolean) {
    const inviteSession = this.inviteMapping.get(waitRoomID);

    if (!inviteSession) {
      throw new SessionNotFoundError('Invite session not found');
    }

    clearTimeout(inviteSession.timeout);

    if (accepted) {
      this.changePlayerStatus(
        inviteSession.challengerID,
        PlayerLobbyStatus.On_Battle,
      );
      this.changePlayerStatus(
        inviteSession.opponentID,
        PlayerLobbyStatus.On_Battle,
      );
    } else {
      this.changePlayerStatus(
        inviteSession.challengerID,
        PlayerLobbyStatus.Ready,
      );
      this.changePlayerStatus(
        inviteSession.opponentID,
        PlayerLobbyStatus.Ready,
      );
    }

    this.inviteMapping.delete(waitRoomID);
  }
}
