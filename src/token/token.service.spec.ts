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
  let jwtService: DeepMockProxy<JwtService>;

  beforeEach(async () => {
    databaseMock = mockDeep<DatabaseService>();
    jwtService = mockDeep<JwtService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: DatabaseService,
          useValue: databaseMock,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ACCESS_TOKEN_SECRET') {
                return 'ACCESS_TOKEN_SECRET';
              }

              if (key === 'SESSION_TOKEN_SECRET') {
                return 'SESSION_TOKEN_SECRET';
              }

              if (key === 'RESET_TOKEN_SECRET') {
                return 'RESET_TOKEN_SECRET';
              }
            }),
          },
        },
      ],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  describe('Token Generation', () => {
    const accessTokenDTO: AccessTokenPayloadDto = {
      id: 'n1',
      nickname: 'Asplay',
    };
    const sessionTokenDTO: SessionTokenPayloadDto = { id: 'n2' };
    const resetTokenDTO: ResetTokenPayloadDto = { id: 'n3' };

    it('should return an access token', async () => {
      jwtService.signAsync.mockResolvedValue('AccessToken');

      const result = await tokenService.generateToken(
        accessTokenDTO,
        TokenType.ACCESS,
      );

      expect(result).toEqual('AccessToken');
      expect(jwtService.signAsync).toHaveBeenCalledWith(accessTokenDTO, {
        expiresIn: '10MINUTE',
        secret: 'ACCESS_TOKEN_SECRET',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('should return a session token', async () => {
      jwtService.signAsync.mockResolvedValue('SessionToken');

      const result = await tokenService.generateToken(
        sessionTokenDTO,
        TokenType.SESSION,
      );

      expect(result).toEqual('SessionToken');
      expect(jwtService.signAsync).toHaveBeenCalledWith(sessionTokenDTO, {
        expiresIn: '3DAYS',
        secret: 'SESSION_TOKEN_SECRET',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
    });

    it('should return a reset token', async () => {
      jwtService.signAsync.mockResolvedValue('ResetToken');

      const result = await tokenService.generateToken(
        resetTokenDTO,
        TokenType.RESET,
      );

      expect(result).toEqual('ResetToken');
      expect(jwtService.signAsync).toHaveBeenCalledWith(resetTokenDTO, {
        expiresIn: '1HOUR',
        secret: 'RESET_TOKEN_SECRET',
      });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Token Validation', () => {
    describe('Access Token', () => {
      it('should successfully validate the access token', async () => {
        jwtService.verify.mockReturnValue({ token: 'validated' });

        const result = await tokenService.validateToken(
          'accessToken',
          TokenType.ACCESS,
        );

        expect(result).toEqual({ token: 'validated' });
        expect(jwtService.verify).toHaveBeenCalledWith('accessToken', {
          secret: 'ACCESS_TOKEN_SECRET',
        });
        expect(jwtService.verify).toHaveBeenCalledTimes(1);
      });

      it('should throw a forbidden exception when validating the access token', async () => {
        jwtService.verify.mockImplementation(() => {
          throw new Error();
        });

        await expect(
          tokenService.validateToken('accessToken', TokenType.ACCESS),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Session Or Reset Token', () => {
      const returnedToken: Token = {
        id: 1,
        token: 'sessionToken',
        type: TokenType.SESSION,
        playerID: 'n1',
        createdAt: new Date('2024-12-25T10:30:00Z'),
        expiresAt: new Date('2027-12-25T10:30:00Z'),
      };

      const returnedPlayer: Player = {
        id: 'n1',
        nickname: 'Asplay',
        username: 'Playas',
        hashedPassword: 'hashed',
        createdAt: new Date('2024-12-25T10:30:00Z'),
        updatedAt: new Date(),
      };

      it('token was not found in the DB, should verify if the user exist in the DB and delete all his other tokens', async () => {
        databaseMock.token.findUnique.mockResolvedValue(null);

        databaseMock.player.findUnique.mockResolvedValue(returnedPlayer);

        jwtService.verify.mockReturnValue({
          decodedToken: returnedToken.token,
        });

        await expect(
          tokenService.validateToken('sessionToken', TokenType.SESSION),
        ).rejects.toThrow(ForbiddenException);
        expect(databaseMock.token.deleteMany).toHaveBeenCalledTimes(1);
        expect(databaseMock.token.deleteMany).toHaveBeenCalledWith({
          where: { player: returnedPlayer },
        });
      });

      it('should successfully validate the session or reset token', async () => {
        databaseMock.token.findUnique.mockResolvedValue(returnedToken);

        jwtService.verify.mockReturnValue({
          decodedToken: returnedToken.token,
        });

        const result = await tokenService.validateToken(
          'sessionToken',
          TokenType.SESSION,
        );

        expect(result).toEqual({ decodedToken: returnedToken.token });
        expect(jwtService.verify).toHaveBeenCalledWith('sessionToken', {
          secret: 'SESSION_TOKEN_SECRET',
        });
        expect(jwtService.verify).toHaveBeenCalledTimes(1);
      });

      it('should throw a forbidden exception when validating the session or reset token', async () => {
        databaseMock.token.findUnique.mockResolvedValue(returnedToken);

        jwtService.verify.mockImplementation(() => {
          throw new Error();
        });

        await expect(
          tokenService.validateToken('sessionToken', TokenType.SESSION),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('Delete Token', () => {
      it('should delete a token', async () => {
        databaseMock.token.delete.mockResolvedValue({} as any);

        await tokenService.deleteToken('some-token');

        expect(databaseMock.token.delete).toHaveBeenCalledWith({
          where: { token: 'some-token' },
        });
      });
    });
  });
});
