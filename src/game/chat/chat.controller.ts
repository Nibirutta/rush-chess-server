import { Body, Controller, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Body() paginationPropertiesDTO: PaginationPropertiesDTO) {
    return this.chatService.getMessages(paginationPropertiesDTO);
  }
}
