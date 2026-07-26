import { Injectable } from '@nestjs/common';
import { TokenType } from '../enums/token-type.enum';
import {
  AccessTokenPayloadDto,
  SessionTokenPayloadDto,
  ResetTokenPayloadDto,
} from '../contracts/token.dto';
import { DatabaseService } from '../database/database.service';
import {
  DecodedAccessToken,
  DecodedSessionToken,
  DecodedResetToken,
} from '../interfaces/decoded-token.interface';
import {
  FailedTokenValidationError,
  SecretMapEmptyError,
} from '../errors/token.errors';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Token } from 'src/generated/prisma/client';
import { StringValue } from 'ms';
import { ChessConfigService } from '../config/chess-config.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly chessConfigService: ChessConfigService,
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

  getSecretByTokenType(tokenType: TokenType): string {
    const secretMap = {
      [TokenType.ACCESS]: this.chessConfigService.getAccessTokenSecret(),
      [TokenType.SESSION]: this.chessConfigService.getSessionTokenSecret(),
      [TokenType.RESET]: this.chessConfigService.getResetTokenSecret(),
    };

    if (!secretMap[tokenType])
      throw new SecretMapEmptyError('Token key is missing');

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

  async generateToken(
    payload:
      | AccessTokenPayloadDto
      | SessionTokenPayloadDto
      | ResetTokenPayloadDto,
    tokenType: TokenType,
  ): Promise<string> {
    const encryptedToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.getTokenDuration(tokenType),
      secret: this.getSecretByTokenType(tokenType),
    });

    if (tokenType === TokenType.SESSION || tokenType === TokenType.RESET) {
      const encryptedTokenData: Prisma.TokenCreateInput = {
        token: encryptedToken,
        type: tokenType,
        player: {
          connect: {
            id: payload.playerID,
          },
        },
        expiresAt: this.getTokenExpirationDate(tokenType),
      };

      await this.databaseService.token.create({ data: encryptedTokenData });
    }

    return encryptedToken;
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
        throw new FailedTokenValidationError('Invalid token');
      }
    } else {
      const foundToken = await this.databaseService.token.findUnique({
        where: { token: token },
      });

      if (!foundToken) {
        void this.protectPlayerFromTokenReplayAttack(token, tokenType);

        throw new FailedTokenValidationError('Invalid token');
      }

      try {
        const decodedToken = this.jwtService.verify<
          DecodedSessionToken | DecodedResetToken
        >(token, {
          secret: this.getSecretByTokenType(tokenType),
        });

        return decodedToken;
      } catch {
        throw new FailedTokenValidationError('Invalid token');
      }
    }
  }

  async deleteToken(token: string): Promise<Token> {
    return this.databaseService.token.delete({ where: { token: token } });
  }

  async protectPlayerFromTokenReplayAttack(
    token: string,
    tokenType: TokenType,
  ): Promise<void> {
    try {
      const decodedToken = this.jwtService.verify<
        DecodedSessionToken | DecodedResetToken
      >(token, {
        secret: this.getSecretByTokenType(tokenType),
      });

      const invadedPlayer = await this.databaseService.player.findUnique({
        where: { id: decodedToken.playerID },
      });

      if (invadedPlayer) {
        await this.databaseService.token.deleteMany({
          where: { playerID: invadedPlayer.id },
        });
      }
    } catch {
      // Do nothing
    }
  }
}
