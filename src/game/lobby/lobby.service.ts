import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { SendMessageDTO } from '../dto/messaging.dto';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';
import { PlayerSocketData } from '../interfaces/socket-data.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { EVENTS_PATTERN } from '../events/events.pattern';
import { InviteTicket, OnInviteExpired } from '../dto/inviting.dto';

type PlayerLobbyStatus = 'READY' | 'NOT_READY' | 'AWAITING' | 'ON_BATTLE';

interface PlayerLobbyInfo extends PlayerSocketData {
  socketID: string;
  status: PlayerLobbyStatus;
}

interface InviteSession {
  timeout: NodeJS.Timeout;
  challengerID: string;
  opponentID: string;
}

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
      status: 'READY',
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
    // eslint-disable-next-line
    const messageContent: string = `[${nickname}] - ${sendMessageDTO.content.replaceAll(/[\[\]]/g, '')}`;
    const messageData: Prisma.MessageCreateInput = {
      content: messageContent,
      player: {
        connect: {
          id: playerID,
        },
      },
    };

    return this.databaseService.message.create({ data: messageData });
  }

  invite(challengerID: string, opponentID: string) {
    const foundOpponent = this.onlinePlayers.get(opponentID);

    if (!foundOpponent) throw new Error('Opponent not found');
    if (challengerID === opponentID || foundOpponent.status !== 'READY')
      throw new Error('Invalid opponent');

    const waitRoomID = randomUUID().toString();
    const inviteExpirationTimeout = setTimeout(() => {
      this.changePlayerStatus(challengerID, 'READY');
      this.changePlayerStatus(opponentID, 'READY');

      this.eventEmitter.emit(
        EVENTS_PATTERN.ON_INVITE_EXPIRED,
        new OnInviteExpired(waitRoomID),
      );
    }, 15000);

    this.inviteMapping.set(waitRoomID, {
      timeout: inviteExpirationTimeout,
      challengerID: challengerID,
      opponentID: opponentID,
    });

    this.changePlayerStatus(challengerID, 'AWAITING');
    this.changePlayerStatus(opponentID, 'AWAITING');

    return new InviteTicket(waitRoomID, foundOpponent.socketID);
  }

  changePlayerStatus(playerID: string, status: PlayerLobbyStatus) {
    const foundPlayer = this.onlinePlayers.get(playerID);

    if (!foundPlayer) return;

    foundPlayer.status = status;
  }

  resolveInvite(waitRoomID: string, accepted: boolean) {
    const inviteSession = this.inviteMapping.get(waitRoomID);

    if (!inviteSession) {
      throw new Error('Invite session not found');
    }

    clearTimeout(inviteSession.timeout);
    const challenger = this.onlinePlayers.get(inviteSession.challengerID);
    const opponent = this.onlinePlayers.get(inviteSession.opponentID);

    this.inviteMapping.delete(waitRoomID);

    if (!challenger || !opponent) throw new Error('Both players not found');

    if (accepted) {
      challenger.status = 'ON_BATTLE';
      opponent.status = 'ON_BATTLE';
    } else {
      challenger.status = 'READY';
      opponent.status = 'READY';
    }
  }
}
