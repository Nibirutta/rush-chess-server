import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { SendMessageDTO, PaginationPropertiesDTO } from '../dto/message.dto';
import { PlayerSocketData } from '../../common/interfaces/socket-data.interface';
import { randomUUID } from 'crypto';
import { InviteSession, InviteTicket } from '../interfaces/invite.interface';
import { PlayerLobbyData } from '../interfaces/player-lobby-data.interface';
import { PlayerStatus } from 'src/common/enums/player-status.enum';
import {
  InvalidOpponentError,
  PlayerIsOfflineError,
  SessionNotFoundError,
} from 'src/common/errors/lobby.errors';
import { DomainEventEmitterService } from 'src/common/event/domain-event-emitter.service';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';
import { PlayerID, WaitRoomID } from '../types/game.types';

@Injectable()
export class LobbyService {
  private onlinePlayers: Map<PlayerID, PlayerLobbyData> = new Map();
  private inviteMapping: Map<WaitRoomID, InviteSession> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {}

  playerConnected(playerSocketData: PlayerSocketData, socketID: string) {
    this.onlinePlayers.set(playerSocketData.playerID, {
      playerID: playerSocketData.playerID,
      nickname: playerSocketData.nickname,
      socketID: socketID,
      status: PlayerStatus.Ready,
    });
  }

  playerDisconnected(playerSocketData: PlayerSocketData) {
    this.onlinePlayers.delete(playerSocketData.playerID);
  }

  getOnlinePlayers(): Array<PlayerLobbyData> {
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
    const formattedMessage = this.formatMessage(
      sendMessageDTO.content,
      nickname,
    );
    const messageData: Prisma.MessageCreateInput = {
      content: formattedMessage,
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
    const inviteExpirationTimeInMS = 15000;
    const foundOpponent = this.onlinePlayers.get(opponentID);

    if (!foundOpponent) throw new PlayerIsOfflineError('Opponent is offline');
    if (
      challengerID === opponentID ||
      foundOpponent.status !== PlayerStatus.Ready
    )
      throw new InvalidOpponentError('Opponent is not ready or ID is invalid');

    const waitRoomID = randomUUID().toString();
    const inviteExpirationTimeout = setTimeout(() => {
      this.changePlayerStatus(challengerID, PlayerStatus.Ready);
      this.changePlayerStatus(opponentID, PlayerStatus.Ready);

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED, {
        waitRoomID: waitRoomID,
      });
    }, inviteExpirationTimeInMS);

    this.inviteMapping.set(waitRoomID, {
      timeout: inviteExpirationTimeout,
      challengerID: challengerID,
      opponentID: opponentID,
    });

    this.changePlayerStatus(challengerID, PlayerStatus.Awaiting);
    this.changePlayerStatus(opponentID, PlayerStatus.Awaiting);

    const inviteTicket: InviteTicket = {
      waitRoomID: waitRoomID,
      opponentSocketID: foundOpponent.socketID,
    };

    return inviteTicket;
  }

  isPlayerReady(playerID: string, ready: boolean) {
    if (ready) {
      this.changePlayerStatus(playerID, PlayerStatus.Ready);
    } else {
      this.changePlayerStatus(playerID, PlayerStatus.Not_Ready);
    }
  }

  changePlayerStatus(playerID: string, status: PlayerStatus) {
    const foundPlayer = this.onlinePlayers.get(playerID);

    if (!foundPlayer) return;
    if (foundPlayer.status === status) return;

    foundPlayer.status = status;

    this.domainEventEmitter.emit(
      DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
      {
        playerID: playerID,
        status: status,
      },
    );
  }

  resolveInvite(waitRoomID: string, accepted: boolean) {
    const inviteSession = this.inviteMapping.get(waitRoomID);

    if (!inviteSession) {
      throw new SessionNotFoundError('Invite session not found');
    }

    clearTimeout(inviteSession.timeout);

    if (accepted) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED, {
        matchID: waitRoomID,
        challengerID: inviteSession.challengerID,
        opponentID: inviteSession.opponentID,
      });

      this.changePlayerStatus(
        inviteSession.challengerID,
        PlayerStatus.On_Battle,
      );
      this.changePlayerStatus(inviteSession.opponentID, PlayerStatus.On_Battle);
    } else {
      this.changePlayerStatus(inviteSession.challengerID, PlayerStatus.Ready);
      this.changePlayerStatus(inviteSession.opponentID, PlayerStatus.Ready);
    }

    this.inviteMapping.delete(waitRoomID);
  }
}
