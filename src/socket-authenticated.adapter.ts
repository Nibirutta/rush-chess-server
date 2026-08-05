/* eslint-disable */
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import {
  TokenService,
  TokenType,
  InconsistentTokenInfoError,
  ValidationTokenMissingError,
  BaseSocket,
  COOKIE_NAMES,
  DecodedAccessToken,
  DecodedSessionToken,
} from '@app/common';
import { ExtendedError, Server, ServerOptions } from 'socket.io';
import * as cookie from 'cookie';
import { corsOptions } from './configCors';

export class SocketAuthenticatedAdapter extends IoAdapter {
  private readonly tokenService: TokenService;

  constructor(app: INestApplicationContext) {
    super(app);
    this.tokenService = app.get(TokenService);
  }

  validateBeforeConnection = async (
    socket: BaseSocket,
    next: (error?: ExtendedError) => void,
  ): Promise<void> => {
    try {
      const accessToken: string =
        socket.handshake.auth[COOKIE_NAMES.ACCESS_TOKEN] ||
        socket.handshake.query[COOKIE_NAMES.ACCESS_TOKEN];
      const sessionToken: string | undefined = cookie.parse(
        socket.handshake.headers.cookie || '',
      )[COOKIE_NAMES.SESSION_TOKEN];

      if (!accessToken || !sessionToken)
        throw new ValidationTokenMissingError(
          'Access token or session token or both are missing',
        );

      const decodedAccessToken: DecodedAccessToken =
        await this.tokenService.validateToken(accessToken, TokenType.ACCESS);

      const decodedSessionToken: DecodedSessionToken =
        await this.tokenService.validateToken(sessionToken, TokenType.SESSION);

      if (decodedAccessToken.playerID !== decodedSessionToken.playerID)
        throw new InconsistentTokenInfoError('Decoded token info conflict');

      socket.data = {
        playerID: decodedAccessToken.playerID,
      };

      return next();
    } catch (error) {
      return next(new Error(error));
    }
  };

  createIOServer(port: number, options?: ServerOptions): Server {
    const server: Server = super.createIOServer(port, {
      ...options,
      corsOptions,
    });

    server.of('lobby').use(this.validateBeforeConnection);
    server.of('chess').use(this.validateBeforeConnection);

    return server;
  }
}
