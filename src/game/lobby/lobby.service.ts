import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  PlayerStatus,
  InvalidOpponentError,
  PlayerIsOfflineError,
  InviteNotFoundError,
  DomainEventEmitterService,
  DOMAIN_EVENTS_PATTERN,
} from '@app/common';
import { Prisma } from 'src/generated/prisma/client';
import { randomUUID } from 'crypto';
import { InviteTicket } from '../interfaces/invite.interface';
import { InviteExpirationJob } from '../queues/invite.jobs';
import { InjectQueue } from '@nestjs/bullmq';
import {
  INVITE_EXPIRE_JOB,
  INVITE_QUEUES,
} from '../queues/game-queues.constants';
import { Queue } from 'bullmq';
import { PlayerRepository } from './player.repository';
import { OnlinePlayerData } from '../interfaces/player.interface';

@Injectable()
export class LobbyService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
    @InjectQueue(INVITE_QUEUES)
    private readonly inviteQueues: Queue<InviteExpirationJob>,
    private readonly playerRepository: PlayerRepository,
  ) {}

  // Connection

  async playerConnected(playerID: string, socketID: string): Promise<void> {
    const retrievedPlayer = await this.databaseService.player.findUnique({
      where: { id: playerID },
    });

    if (!retrievedPlayer) return;

    const { nickname } = retrievedPlayer;

    await this.playerRepository.save(playerID, {
      playerID,
      socketID,
      nickname,
      status: PlayerStatus.Ready,
    });
  }

  async playerDisconnected(playerID: string): Promise<void> {
    await this.playerRepository.delete(playerID);
  }

  async getOnlinePlayers(): Promise<OnlinePlayerData[]> {
    const onlinePlayers = await this.playerRepository.findAll();

    return onlinePlayers;
  }

  // Messages

  private formatMessage(message: string, nickname: string): string {
    // eslint-disable-next-line
    const messageContent = `[${nickname}] - ${message.replaceAll(/[\[\]]/g, '')}`;

    return messageContent;
  }

  async getMessages(skip: number, amount: number): Promise<string[]> {
    const messages = await this.databaseService.message.findMany({
      skip: skip,
      take: amount,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages.map((message) => message.content);
  }

  async createMessage(
    content: string,
    playerID: string,
  ): Promise<string | undefined> {
    const retrievedPlayer = await this.playerRepository.get(playerID);

    if (!retrievedPlayer) return;

    const { nickname } = retrievedPlayer;

    const formattedMessage = this.formatMessage(content, nickname);
    const messageData: Prisma.MessageCreateInput = {
      content: formattedMessage,
      player: {
        connect: {
          id: playerID,
        },
      },
    };

    await this.databaseService.message.create({ data: messageData });

    return formattedMessage;
  }

  // Invite

  async invite(
    challengerID: string,
    opponentID: string,
  ): Promise<InviteTicket | undefined> {
    const inviteExpirationTimeInMS = 15000;
    const retrievedOpponent = await this.playerRepository.get(opponentID);
    const retrievedPlayer = await this.playerRepository.get(challengerID);

    if (!retrievedPlayer) return;
    if (!retrievedOpponent)
      throw new PlayerIsOfflineError('Opponent is offline');
    if (
      challengerID === opponentID ||
      retrievedOpponent.status !== PlayerStatus.Ready
    )
      throw new InvalidOpponentError('Opponent is not ready or ID is invalid');

    const inviteID = randomUUID().toString();

    await this.inviteQueues.add(
      INVITE_EXPIRE_JOB,
      {
        inviteID,
        challengerID,
        opponentID,
      },
      {
        jobId: inviteID,
        delay: inviteExpirationTimeInMS,
        removeOnComplete: true,
      },
    );

    await this.changePlayerStatus(challengerID, PlayerStatus.Awaiting);
    await this.changePlayerStatus(opponentID, PlayerStatus.Awaiting);

    const inviteTicket: InviteTicket = {
      inviteID: inviteID,
      challengerNickname: retrievedPlayer.nickname,
      opponentSocketID: retrievedOpponent.socketID,
    };

    return inviteTicket;
  }

  async resolveInvite(inviteID: string, accepted: boolean): Promise<void> {
    const foundInvite = await this.inviteQueues.getJob(inviteID);

    if (!foundInvite) {
      throw new InviteNotFoundError('Invite not found');
    }

    const { challengerID, opponentID } = foundInvite.data;

    await foundInvite.remove();

    if (accepted) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED, {
        matchID: inviteID,
        challengerID,
        opponentID,
      });

      await this.changePlayerStatus(challengerID, PlayerStatus.On_Battle);
      await this.changePlayerStatus(opponentID, PlayerStatus.On_Battle);
    } else {
      await this.changePlayerStatus(challengerID, PlayerStatus.Ready);
      await this.changePlayerStatus(opponentID, PlayerStatus.Ready);
    }
  }

  // Player

  async setPlayerStatus(playerID: string, ready: boolean): Promise<void> {
    if (ready) {
      await this.changePlayerStatus(playerID, PlayerStatus.Ready);
    } else {
      await this.changePlayerStatus(playerID, PlayerStatus.Not_Ready);
    }
  }

  async changePlayerStatus(
    playerID: string,
    status: PlayerStatus,
  ): Promise<void> {
    const foundPlayer = await this.playerRepository.get(playerID);

    if (!foundPlayer) return;

    await this.playerRepository.update(playerID, { status: status });

    this.domainEventEmitter.emit(
      DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
      {
        playerID: playerID,
        status: status,
      },
    );
  }
}
