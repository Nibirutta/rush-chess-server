import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { DomainError } from '../errors/domain.errors';
import { OUTGOING_MESSAGES } from '../messages/messages.pattern';

@Catch(DomainError)
export class WsDomainExceptionFilter extends BaseWsExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const client: Socket = host.switchToWs().getClient();

    client.emit(OUTGOING_MESSAGES.NOTIFY_EXCEPTION, {
      message: error.message,
      error: error.name,
      timestamp: new Date().toISOString(),
      ...(error.body ? { details: error.body } : {}),
    });
  }
}
