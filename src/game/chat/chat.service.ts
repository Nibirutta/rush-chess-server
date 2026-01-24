import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/database/database.service";
import { Prisma } from "src/generated/prisma/client";
import { SendMessageDTO } from "../dto/send-message.dto";

@Injectable()
export class ChatService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createMessage(sendMessageDTO: SendMessageDTO, playerID: string, nickname: string) {
    const messageContent: string = `[${nickname}] - ${sendMessageDTO.content.replaceAll(/[\[\]]/g, '')}`;
    const messageData: Prisma.MessageCreateInput = {
      content: messageContent,
      player: {
        connect: {
          id: playerID
        }
      }
    };

    return this.databaseService.message.create({ data: messageData });
  }
}