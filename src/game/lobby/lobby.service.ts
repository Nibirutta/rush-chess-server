import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { SendMessageDTO } from '../dto/messaging.dto';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';
import { PlayerSocketData } from '../interfaces/socket-data.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface PlayerLobbyInfo extends PlayerSocketData {
  socketID: string;
  status: 'READY' | 'NOT_READY' | 'ON_BATTLE';
}

@Injectable()
export class LobbyService {
  private onlinePlayers: Map<string, PlayerLobbyInfo> = new Map();
  private inviteMapping: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  playerConnected(socketID: string, playerSocketData: PlayerSocketData) {
    this.onlinePlayers.set(socketID, {
      playerID: playerSocketData.playerID,
      socketID: socketID,
      nickname: playerSocketData.nickname,
      status: 'READY',
    });
  }

  playerDisconnected(socketID: string) {
    this.onlinePlayers.delete(socketID);
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
}
