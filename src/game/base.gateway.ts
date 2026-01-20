import { OnGatewayConnection } from '@nestjs/websockets';
import { TokenService } from 'src/token/token.service';
import { TokenType } from 'src/common/enums/token-type.enum';
import { Socket } from 'socket.io';
import * as cookie from 'cookie';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export abstract class BaseGateway implements OnGatewayConnection {
  constructor(private readonly tokenService: TokenService) {}

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const accessToken = client.handshake.auth.accessToken || client.handshake.query.accessToken;      
      const sessionToken = cookie.parse(client.handshake.headers.cookie || '')[
        'sessionToken'
      ];
      
      if (!accessToken || !sessionToken) throw new UnauthorizedException('Token missing');

      const decodedAccessToken = await this.tokenService.validateToken(accessToken, TokenType.ACCESS);
      const decodedSessionToken = await this.tokenService.validateToken(sessionToken, TokenType.SESSION);

      if (decodedAccessToken.id != decodedSessionToken.id) throw new ForbiddenException('Invalid access');

      client.join(decodedAccessToken.id);
    } catch (error) {      
      client.emit('connection_error', { error });
      client.disconnect();
    }
  }
}
