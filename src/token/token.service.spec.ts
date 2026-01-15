import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { DatabaseService } from 'src/database/database.service';
import { TokenType } from 'src/common/enums/token-type.enum';
import {
  AccessTokenPayloadDto,
  SessionTokenPayloadDto,
  ResetTokenPayloadDto,
} from 'src/common/contracts/token.dto';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { Token, Player } from 'src/generated/prisma/client';

describe('TokenService', () => {
  let tokenService: TokenService;
  let databaseMock: DeepMockProxy<DatabaseService>;
  let jwtServiceMock: DeepMockProxy<JwtService>;

  const fixedDate = new Date('2023-06-21T09:41:00Z');
  const jwtString = 'encoded.jwt.string';

  const playerStub: Player = {
    id: 'n8r7d2466',
    nickname: 'Asplay',
    username: 'Playas',
    hashedPassword: 'hashed',
    createdAt: fixedDate,
    updatedAt: fixedDate,
  };

  const dbTokenStub: Token = {
    id: 1,
    token: jwtString,
    playerID: playerStub.id,
    type: TokenType.SESSION,
    createdAt: fixedDate,
    expiresAt: new Date('2050-12-01'),
  };

  const payloadStub = {
    id: playerStub.id,
    nickname: playerStub.nickname,
  };

  beforeEach(async () => {
    databaseMock = mockDeep<DatabaseService>();
    jwtServiceMock = mockDeep<JwtService>();

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: DatabaseService,
          useValue: databaseMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => key),
          },
        },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  describe('generateToken', () => {
    it('should generate an access token (Stateless - No DB)', async () => {
      jwtServiceMock.signAsync.mockResolvedValue(jwtString);

      const accessTokenPayload: AccessTokenPayloadDto = payloadStub;

      const result = await tokenService.generateToken(
        accessTokenPayload,
        TokenType.ACCESS,
      );

      expect(result).toEqual(jwtString);
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(accessTokenPayload, {
        expiresIn: '10MINUTE',
        secret: 'ACCESS_TOKEN_SECRET',
      });
      expect(databaseMock.token.create).not.toHaveBeenCalled();
    });

    it('should generate a session token and save to DB', async () => {
      jwtServiceMock.signAsync.mockResolvedValue(jwtString);

      const sessionTokenPayload: SessionTokenPayloadDto = {
        id: payloadStub.id,
      };

      const result = await tokenService.generateToken(
        sessionTokenPayload,
        TokenType.SESSION,
      );

      expect(result).toEqual(jwtString);
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(sessionTokenPayload, {
        expiresIn: '3DAYS',
        secret: 'SESSION_TOKEN_SECRET',
      });

      expect(databaseMock.token.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: jwtString,
          type: TokenType.SESSION,
          player: { connect: { id: sessionTokenPayload.id } },
        }),
      });
    });

    it('should generate a reset token and save to DB', async () => {
      jwtServiceMock.signAsync.mockResolvedValue(jwtString);

      const resetTokenPayload: ResetTokenPayloadDto = { id: payloadStub.id };

      const result = await tokenService.generateToken(
        resetTokenPayload,
        TokenType.RESET,
      );

      expect(result).toEqual(jwtString);
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(resetTokenPayload, {
        expiresIn: '1HOUR',
        secret: 'RESET_TOKEN_SECRET',
      });
      
      expect(databaseMock.token.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: jwtString,
          type: TokenType.RESET,
          player: { connect: { id: resetTokenPayload.id }},
        }),
      });
    });
  });

  describe('generateSessionTokens', () => {
    it('should return both access and session tokens', async () => {
      jwtServiceMock.signAsync.mockResolvedValue(jwtString);

      const result = await tokenService.generateSessionTokens(playerStub.id, playerStub.nickname);

      expect(result).toEqual({
        accessToken: jwtString,
        sessionToken: jwtString
      });
      expect(jwtServiceMock.signAsync).toHaveBeenCalledTimes(2);
      expect(databaseMock.token.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateToken', () => {
    describe('when validating access token', () => {
      it('should return decoded payload if valid', async () => {
        jwtServiceMock.verify.mockReturnValue(payloadStub);

        const result = await tokenService.validateToken(
          jwtString,
          TokenType.ACCESS,
        );

        expect(result).toEqual(payloadStub);
        expect(jwtServiceMock.verify).toHaveBeenCalledWith(jwtString, {
          secret: 'ACCESS_TOKEN_SECRET',
        });
      });

      it('should throw a forbidden exception when validating the access token', async () => {
        jwtServiceMock.verify.mockImplementation(() => {
          throw new Error();
        });

        await expect(
          tokenService.validateToken('accessToken', TokenType.ACCESS),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('when validating session/reset token', () => {
      it('should validate successfully if token exists in DB and JWT is valid', async () => {
        databaseMock.token.findUnique.mockResolvedValue(dbTokenStub);

        jwtServiceMock.verify.mockReturnValue(payloadStub);

        const result = await tokenService.validateToken(
          jwtString,
          TokenType.SESSION,
        );

        expect(result).toEqual(payloadStub);
        expect(databaseMock.token.findUnique).toHaveBeenCalledWith({
          where: { token: jwtString },
        });
      });

      it('should detect TOKEN REUSE: if token not in DB but signature is valid, invalidate all user sessions', async () => {
        databaseMock.token.findUnique.mockResolvedValue(null);

        databaseMock.player.findUnique.mockResolvedValue(playerStub);

        jwtServiceMock.verify.mockReturnValue({ id: playerStub.id});

        await expect(
          tokenService.validateToken(jwtString, TokenType.SESSION),
        ).rejects.toThrow(ForbiddenException);
        expect(databaseMock.token.deleteMany).toHaveBeenCalledWith({
          where: { player: playerStub },
        });
      });

      it('should throw ForbiddenException if token exists in DB but JWT signature is invalid', async () => {
        databaseMock.token.findUnique.mockResolvedValue(dbTokenStub);
        jwtServiceMock.verify.mockImplementation(() => {
          throw new Error();
        });

        await expect(
          tokenService.validateToken(jwtString, TokenType.SESSION),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('deleteToken', () => {
      it('should delete a token', async () => {
        databaseMock.token.delete.mockResolvedValue(dbTokenStub);

        await tokenService.deleteToken(jwtString);

        expect(databaseMock.token.delete).toHaveBeenCalledWith({
          where: { token: jwtString },
        });
      });
    });
  });
});
