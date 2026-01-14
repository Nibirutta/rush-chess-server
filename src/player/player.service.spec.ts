import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PlayerService } from './player.service';
import { DatabaseService } from 'src/database/database.service';
import { TokenService } from 'src/token/token.service';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { omit } from 'lodash';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { LoginPlayerDTO } from './contracts/login-player.dto';
import { UpdatePlayerDTO } from './contracts/update-player.dto';
import { TokenType } from 'src/generated/prisma/enums';

describe('PlayerService', () => {
  let playerService: PlayerService;
  let tokenServiceMock: DeepMockProxy<TokenService>;
  let databaseMock: DeepMockProxy<DatabaseService>;

  const fixedDate = new Date('2024-12-25T10:30:00Z');

  const playerStub = {
    id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
    username: 'marcus',
    nickname: 'hehepotter',
    hashedPassword: 'hashedPassword123',
    createdAt: fixedDate,
    updatedAt: fixedDate,
  };

  const tokensStub = {
    accessToken: 'valid_access_token',
    sessionToken: 'valid_session_token',
  };

  const successResponseStub = {
    player: omit(playerStub, ['hashedPassword']),
    accessToken: tokensStub.accessToken,
    sessionToken: tokensStub.sessionToken,
  };

  beforeEach(async () => {
    databaseMock = mockDeep<DatabaseService>();
    tokenServiceMock = mockDeep<TokenService>();

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        { provide: DatabaseService, useValue: databaseMock },
        { provide: TokenService, useValue: tokenServiceMock },
      ],
    }).compile();

    playerService = module.get<PlayerService>(PlayerService);
  });

  it('should be defined', () => {
    expect(playerService).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginPlayerDTO = {
      username: 'marcus',
      password: 'password123',
    };

    it('should login successfully', async () => {
      const validHash = await bcrypt.hash(loginDto.password, 10);
      const playerWithValidHash = { ...playerStub, hashedPassword: validHash };

      databaseMock.player.findUnique.mockResolvedValue(playerWithValidHash);
      tokenServiceMock.generateSessionTokens.mockResolvedValue(tokensStub);

      const result = await playerService.login(loginDto);

      expect(result).toEqual(successResponseStub);
      expect(tokenServiceMock.generateSessionTokens).toHaveBeenCalledWith(
        playerStub.id,
        playerStub.nickname,
      );
    });

    it('should throw UnauthorizedException if player not found', async () => {
      databaseMock.player.findUnique.mockResolvedValue(null);

      await expect(playerService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      databaseMock.player.findUnique.mockResolvedValue(playerStub);

      await expect(playerService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshSession', () => {
    const cookieStub = {
      id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
      iat: '1243558791',
      exp: '1243948921'
    };

    it('should return new session tokens', async () => {
      databaseMock.player.findUnique.mockResolvedValue(playerStub);
      tokenServiceMock.validateToken.mockResolvedValue(cookieStub);
      tokenServiceMock.generateSessionTokens.mockResolvedValue(tokensStub);

      const result = await playerService.refreshSession('randomCookie');

      expect(result).toEqual(successResponseStub);
      expect(databaseMock.player.findUnique).toHaveBeenCalledWith({
        where: { id: cookieStub.id }
      });
      expect(tokenServiceMock.validateToken).toHaveBeenCalledWith('randomCookie', TokenType.SESSION);
      expect(tokenServiceMock.deleteToken).toHaveBeenCalledWith('randomCookie');
    });

    it('should throw NotFoundException if player was not found', async () => {
      tokenServiceMock.validateToken.mockResolvedValue(cookieStub);
      databaseMock.player.findUnique.mockResolvedValue(null);

      await expect(playerService.refreshSession('randomCookie')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPlayer', () => {
    const createDto: CreatePlayerDTO = {
      nickname: 'hehepotter',
      username: 'marcus',
      password: 'password123',
    };

    it('should create a new player and return tokens', async () => {
      databaseMock.player.create.mockResolvedValue(playerStub);
      tokenServiceMock.generateSessionTokens.mockResolvedValue(tokensStub);

      const result = await playerService.createPlayer(createDto);

      expect(result).toEqual(successResponseStub);
      expect(databaseMock.player.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: createDto.username,
          hashedPassword: expect.any(String),
        }),
      });
    });

    it('should propagate database errors', async () => {
      databaseMock.player.create.mockRejectedValue(new Error('DB Error'));
      await expect(playerService.createPlayer(createDto)).rejects.toThrow(
        'DB Error',
      );
    });
  });

  describe('updatePlayer', () => {
    const updateDto: UpdatePlayerDTO = {
      nickname: 'NewNick',
    };

    it('should update player and refresh tokens', async () => {
      const updatedPlayerStub = { ...playerStub, nickname: 'NewNick' };

      databaseMock.player.update.mockResolvedValue(updatedPlayerStub);
      tokenServiceMock.generateSessionTokens.mockResolvedValue(tokensStub);

      const result = await playerService.updatePlayer(playerStub.id, updateDto);

      expect(result).toEqual({
        ...successResponseStub,
        player: omit(updatedPlayerStub, ['hashedPassword']),
      });

      expect(databaseMock.player.update).toHaveBeenCalledWith({
        where: { id: playerStub.id },
        data: expect.objectContaining({ nickname: 'NewNick' }),
      });
    });

    it('should throw if player does not exist (database error)', async () => {
      databaseMock.player.update.mockRejectedValue(new Error());
      await expect(
        playerService.updatePlayer('unknownID', updateDto),
      ).rejects.toThrow();
    });
  });

  describe('deletePlayer', () => {
    it('should delete player successfully', async () => {
      databaseMock.player.delete.mockResolvedValue(playerStub);

      await playerService.deletePlayer(playerStub.id);

      expect(databaseMock.player.delete).toHaveBeenCalledWith({
        where: { id: playerStub.id },
      });
    });

    it('should throw Error if player does not exist', async () => {
      databaseMock.player.delete.mockRejectedValue(new Error());
      await expect(playerService.deletePlayer('unknownID')).rejects.toThrow();
    });
  });
});
