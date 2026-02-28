import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(HttpException)
export class WsExceptionTransformFilter extends BaseWsExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const client: Socket = host.switchToWs().getClient();
    const response = exception.getResponse();

    client.emit('exception', {
      status: 'error',
      error: response,
    });
  }
}
