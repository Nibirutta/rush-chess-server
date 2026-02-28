/* eslint-disable */
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { TokenService } from './token/token.service';
import { ExtendedError, Server, ServerOptions, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { TokenType } from './common/enums/token-type.enum';
import { PlayerSocketData } from './game/interfaces/socket-data.interface';
import { corsOptions } from './configCors';

export class SocketAuthenticatedAdapter extends IoAdapter {
  private readonly tokenService: TokenService;

  constructor(app: INestApplicationContext) {
    super(app);
    this.tokenService = app.get(TokenService);
  }

  validateBeforeConnection = async (
    socket: Socket,
    next: (error?: ExtendedError) => void,
  ) => {
    try {
      const accessToken =
        (socket.handshake.auth.accessToken as string) ||
        (socket.handshake.query.accessToken as string);
      const sessionToken = cookie.parse(socket.handshake.headers.cookie || '')[
        'sessionToken'
      ];

      if (!accessToken || !sessionToken) throw new Error('Token missing');

      const decodedAccessToken = await this.tokenService.validateToken(
        accessToken,
        TokenType.ACCESS,
      );
      const decodedSessionToken = await this.tokenService.validateToken(
        sessionToken,
        TokenType.SESSION,
      );

      if (decodedAccessToken.id != decodedSessionToken.id)
        throw new Error('invalid access');

      socket.data = {
        playerID: decodedAccessToken.id,
        nickname: decodedAccessToken.nickname,
      } as PlayerSocketData;

      return next();
    } catch (error) {
      return next(new Error(error));
    }
  };

  createIOServer(port: number, options?: ServerOptions) {
    const server: Server = super.createIOServer(port, {
      ...options,
      corsOptions,
    });

    server.of('lobby').use(this.validateBeforeConnection);
    server.of('chess').use(this.validateBeforeConnection);

    return server;
  }
}
