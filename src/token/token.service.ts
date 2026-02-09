import {
  Injectable,
  ForbiddenException,
  NotImplementedException,
} from '@nestjs/common';
import { TokenType } from '../common/enums/token-type.enum';
import {
  AccessTokenPayloadDto,
  SessionTokenPayloadDto,
  ResetTokenPayloadDto,
} from './contracts/token.dto';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from 'src/generated/prisma/client';
import { StringValue } from 'ms';
import { ConfigService } from '@nestjs/config';
import {
  DecodedAccessToken,
  DecodedResetToken,
  DecodedSessionToken,
} from './interfaces/decoded-token.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private readonly tokenExpirations = {
    [TokenType.ACCESS]: {
      duration: '10MINUTE' as StringValue,
      milliseconds: 60 * 1000 * 10,
      minutes: 10,
    },
    [TokenType.SESSION]: {
      duration: '3DAYS' as StringValue,
      milliseconds: 3 * 24 * 60 * 60 * 1000,
      minutes: 4320, // 3 Days
    },
    [TokenType.RESET]: {
      duration: '1HOUR' as StringValue,
      milliseconds: 60 * 60 * 1000,
      minutes: 60,
    },
  };

  async generateToken(
    payload:
      | AccessTokenPayloadDto
      | SessionTokenPayloadDto
      | ResetTokenPayloadDto,
    tokenType: TokenType,
  ): Promise<string> {
    switch (tokenType) {
      case TokenType.ACCESS: {
        const accessToken = await this.jwtService.signAsync(payload, {
          expiresIn: this.getTokenDuration(tokenType),
          secret: this.getSecretByTokenType(tokenType),
        });

        return accessToken;
      }
      case TokenType.SESSION: {
        const sessionToken = await this.jwtService.signAsync(payload, {
          expiresIn: this.getTokenDuration(tokenType),
          secret: this.getSecretByTokenType(tokenType),
        });

        const sessionTokenData: Prisma.TokenCreateInput = {
          token: sessionToken,
          type: TokenType.SESSION,
          player: {
            connect: {
              id: payload.id,
            },
          },
          expiresAt: this.getTokenExpirationDate(tokenType),
        };

        await this.databaseService.token.create({ data: sessionTokenData });

        return sessionToken;
      }
      case TokenType.RESET: {
        const resetToken = await this.jwtService.signAsync(payload, {
          expiresIn: this.getTokenDuration(tokenType),
          secret: this.getSecretByTokenType(tokenType),
        });

        const resetTokenData: Prisma.TokenCreateInput = {
          token: resetToken,
          type: TokenType.RESET,
          player: {
            connect: {
              id: payload.id,
            },
          },
          expiresAt: this.getTokenExpirationDate(tokenType),
        };

        await this.databaseService.token.create({ data: resetTokenData });

        return resetToken;
      }
    }
  }

  async generateSessionTokens(id: string, nickname: string) {
    const accessTokenPayloadDto: AccessTokenPayloadDto = {
      id: id,
      nickname: nickname,
    };

    const sessionTokenPayloadDto: SessionTokenPayloadDto = {
      id: id,
    };

    const accessToken = await this.generateToken(
      accessTokenPayloadDto,
      TokenType.ACCESS,
    );
    const sessionToken = await this.generateToken(
      sessionTokenPayloadDto,
      TokenType.SESSION,
    );

    return {
      accessToken,
      sessionToken,
    };
  }

  validateToken(
    token: string,
    tokenType: TokenType.ACCESS,
  ): Promise<DecodedAccessToken>;
  validateToken(
    token: string,
    tokenType: TokenType.SESSION,
  ): Promise<DecodedSessionToken>;
  validateToken(
    token: string,
    tokenType: TokenType.RESET,
  ): Promise<DecodedResetToken>;

  async validateToken(
    token: string,
    tokenType: TokenType,
  ): Promise<DecodedAccessToken | DecodedSessionToken | DecodedResetToken> {
    if (tokenType === TokenType.ACCESS) {
      try {
        const decodedToken = this.jwtService.verify<DecodedAccessToken>(token, {
          secret: this.getSecretByTokenType(tokenType),
        });

        return decodedToken;
      } catch {
        throw new ForbiddenException('Invalid token');
      }
    } else {
      const foundToken = await this.databaseService.token.findUnique({
        where: { token: token },
      });

      if (!foundToken) {
        try {
          const decodedToken = this.jwtService.verify<
            DecodedSessionToken | DecodedResetToken
          >(token, {
            secret: this.getSecretByTokenType(tokenType),
          });

          const hackedUser = await this.databaseService.player.findUnique({
            where: { id: decodedToken.id },
          });

          if (hackedUser) {
            await this.databaseService.token.deleteMany({
              where: { player: hackedUser },
            });
          }
        } catch {
          // Do nothing
        }
        throw new ForbiddenException('Invalid token');
      }

      try {
        const decodedToken = this.jwtService.verify<
          DecodedSessionToken | DecodedResetToken
        >(token, {
          secret: this.getSecretByTokenType(tokenType),
        });

        return decodedToken;
      } catch {
        throw new ForbiddenException('Invalid token');
      }
    }
  }

  async deleteToken(token: string) {
    return this.databaseService.token.delete({ where: { token: token } });
  }

  getSecretByTokenType(tokenType: TokenType): string {
    const secretMap = {
      [TokenType.ACCESS]: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
      [TokenType.SESSION]: this.configService.get<string>(
        'SESSION_TOKEN_SECRET',
      ),
      [TokenType.RESET]: this.configService.get<string>('RESET_TOKEN_SECRET'),
    };

    if (!secretMap[tokenType])
      throw new NotImplementedException('Token key is missing');

    return secretMap[tokenType];
  }

  getTokenDuration(tokenType: TokenType): StringValue {
    return this.tokenExpirations[tokenType].duration;
  }

  getTokenExpirationDate(tokenType: TokenType): Date {
    const expirationDate = new Date();
    expirationDate.setMinutes(
      expirationDate.getMinutes() + this.tokenExpirations[tokenType].minutes,
    );

    return expirationDate;
  }

  getTokenMaxAge(tokenType: TokenType): number {
    return this.tokenExpirations[tokenType].milliseconds;
  }
}
