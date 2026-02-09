import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { SendMessageDTO } from '../dto/send-message.dto';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';

@Injectable()
export class ChatService {
  constructor(private readonly databaseService: DatabaseService) {}

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
