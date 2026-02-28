import { Body, Controller, Get } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';

@Controller('lobby')
export class LobbyController {
  constructor(private readonly chatService: LobbyService) {}

  @Get('messages')
  async getMessages(@Body() paginationPropertiesDTO: PaginationPropertiesDTO) {
    return this.chatService.getMessages(paginationPropertiesDTO);
  }
}
