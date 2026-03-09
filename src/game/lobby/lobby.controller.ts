import {
  Body,
  Controller,
  Get,
  UseFilters,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';
import { ValidationOptions } from 'src/common/options/validation.options';
import { HttpDomainExceptionFilter } from 'src/common/filters/http-domain-exception.filter';

@Controller('lobby')
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new HttpDomainExceptionFilter())
export class LobbyController {
  constructor(private readonly chatService: LobbyService) {}

  @Get('messages')
  async getMessages(@Body() paginationPropertiesDTO: PaginationPropertiesDTO) {
    return this.chatService.getMessages(paginationPropertiesDTO);
  }
}
