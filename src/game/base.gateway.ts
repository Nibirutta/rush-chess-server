import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { TokenService } from 'src/token/token.service';
import { TokenType } from 'src/common/enums/token-type.enum';
import { Socket, Server } from 'socket.io';
import * as cookie from 'cookie';
import {
  Injectable,
} from '@nestjs/common';
import { PlayerSocketData } from './interfaces/socket-data.interface';
import { EVENTS_PATTERN } from './events/events.pattern';

@Injectable()
export abstract class BaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const accessToken =
        client.handshake.auth.accessToken || client.handshake.query.accessToken;
      const sessionToken = cookie.parse(client.handshake.headers.cookie || '')[
        'sessionToken'
      ];

      if (!accessToken || !sessionToken)
        throw new WsException('Token missing');

      const decodedAccessToken = await this.tokenService.validateToken(
        accessToken,
        TokenType.ACCESS,
      );
      const decodedSessionToken = await this.tokenService.validateToken(
        sessionToken,
        TokenType.SESSION,
      );

      if (decodedAccessToken.id != decodedSessionToken.id)
        throw new WsException('Invalid access');

      client.data = {
        playerID: decodedAccessToken.id,
        nickname: decodedAccessToken.nickname,
      } as PlayerSocketData;

      this.broadcastOnlinePlayers();
    } catch (error) {
      client.emit(EVENTS_PATTERN.CONNECTION_ERROR, { error });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    this.broadcastOnlinePlayers();
  }

  private async broadcastOnlinePlayers() {
    const sockets = await this.server.fetchSockets();
    const onlinePlayers = sockets.map(socket => ({ socket_id: socket.id, player_data: socket.data}));
    
    this.server.emit(
      EVENTS_PATTERN.BROADCAST_ONLINE_PLAYERS,
      JSON.stringify(onlinePlayers),
    );
  }
}
