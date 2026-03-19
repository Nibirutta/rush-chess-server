/* eslint-disable */
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { TokenService } from './token/token.service';
import { ExtendedError, Server, ServerOptions, Socket } from 'socket.io';
import * as cookie from 'cookie';
import { TokenType } from './common/enums/token-type.enum';
import { PlayerSocketData } from './common/interfaces/socket-data.interface';
import { corsOptions } from './configCors';
import {
  InconsistentTokenInfoError,
  ValidationTokenMissingError,
} from './common/errors/token.errors';

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
        socket.handshake.auth.accessToken || socket.handshake.query.accessToken;
      const sessionToken = cookie.parse(socket.handshake.headers.cookie || '')[
        'sessionToken'
      ];

      if (!accessToken || !sessionToken)
        throw new ValidationTokenMissingError(
          'Access token or session token or both are missing',
        );

      const decodedAccessToken = await this.tokenService.validateToken(
        accessToken,
        TokenType.ACCESS,
      );
      const decodedSessionToken = await this.tokenService.validateToken(
        sessionToken,
        TokenType.SESSION,
      );

      if (decodedAccessToken.id != decodedSessionToken.id)
        throw new InconsistentTokenInfoError('Decoded token info conflict');

      const playerData: PlayerSocketData = {
        playerID: decodedAccessToken.id,
        nickname: decodedAccessToken.nickname,
      };

      socket.data = playerData;

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
