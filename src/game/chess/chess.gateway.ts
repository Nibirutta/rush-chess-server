import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ValidationPipe, UsePipes, UseFilters } from '@nestjs/common';
import { ValidationOptions } from 'src/common/options/validation.options';
import { MESSAGES_PATTERN } from '../events/messages.pattern';
import { ChessService } from './chess.service';
import { Server } from 'socket.io';
import { WsDomainExceptionFilter } from 'src/common/filters/ws-domain-exception.filter';

@WebSocketGateway({
  namespace: 'chess',
})
@UsePipes(new ValidationPipe(ValidationOptions))
@UseFilters(new WsDomainExceptionFilter())
export class ChessGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chessService: ChessService) {}

  @SubscribeMessage(MESSAGES_PATTERN.TESTING)
  testing(@MessageBody() data: string) {
    return data;
  }
}
