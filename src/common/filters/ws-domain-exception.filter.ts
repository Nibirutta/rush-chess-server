import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DomainError } from '../errors/domain.errors';
import { GENERAL_EVENTS } from '../websocket/events.pattern';

@Catch(DomainError)
export class WsDomainExceptionFilter extends BaseWsExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const client: Socket = host.switchToWs().getClient();

    client.emit(GENERAL_EVENTS.EXCEPTION, {
      message: error.message,
      error: error.name,
      timestamp: new Date().toISOString(),
      ...(error.body ? { details: error.body } : {}),
    });
  }
}
