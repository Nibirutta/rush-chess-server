import {
  Body,
  Controller,
  Get,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { PaginationPropertiesDTO } from '../dto/message.dto';
import { HttpDomainExceptionFilter, ValidationOptions } from '@app/common';

@Controller('lobby')
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new HttpDomainExceptionFilter())
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Get('messages')
  async getMessages(@Body() paginationPropertiesDTO: PaginationPropertiesDTO) {
    return this.lobbyService.getMessages(paginationPropertiesDTO);
  }
}
