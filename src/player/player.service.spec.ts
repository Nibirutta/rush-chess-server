import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PlayerService } from './player.service';
import { DatabaseService } from 'src/database/database.service';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { omit } from 'lodash';
import * as bcrypt from 'bcrypt';
import { UpdatePlayerDTO } from './contracts/update-player.dto';
import { TokenService } from 'src/token/token.service';
import { LoginPlayerDTO } from './contracts/login-player.dto';
import { UnauthorizedException } from '@nestjs/common';

describe('PlayerService', () => {
  let playerService: PlayerService;
  let tokenServiceMock: DeepMockProxy<TokenService>;
  let databaseMock: DeepMockProxy<DatabaseService>;

  beforeEach(async () => {
    databaseMock = mockDeep<DatabaseService>();
    tokenServiceMock = mockDeep<TokenService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: DatabaseService,
          useValue: databaseMock,
        },
        {
          provide: TokenService,
          useValue: tokenServiceMock,
        },
      ],
    }).compile();

    playerService = module.get<PlayerService>(PlayerService);
  });

  it('should be defined', () => {
    expect(playerService).toBeDefined();
  });

  describe('Login Method', () => {
    const loginPlayerDTO: LoginPlayerDTO = {
      username: 'marcus',
      password: 'hisnameisforbidden',
    };

    it('player should login successfully', async () => {
      const expectedReturn = {
        player: {
          id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
          username: 'marcus',
          nickname: 'hehepotter',
          hashedPassword: await bcrypt.hash('hisnameisforbidden', 10),
          createdAt: new Date('2024-12-25T10:30:00Z'),
          updatedAt: new Date(),
        },
        accessToken: 'token',
        sessionToken: 'token',
      };

      databaseMock.player.findUnique.mockResolvedValue(expectedReturn.player);
      tokenServiceMock.generateSessionTokens.mockResolvedValue({
        accessToken: 'token',
        sessionToken: 'token',
      });

      const result = await playerService.login(loginPlayerDTO);

      expect(result).toEqual(expectedReturn);
      expect(databaseMock.player.findUnique).toHaveBeenCalledWith({
        where: { username: loginPlayerDTO.username },
      });
      expect(tokenServiceMock.generateSessionTokens).toHaveBeenCalledWith(
        expectedReturn.player.id,
        expectedReturn.player.nickname,
      );
      expect(databaseMock.player.findUnique).toHaveBeenCalledTimes(1);
      expect(tokenServiceMock.generateSessionTokens).toHaveBeenCalledTimes(1);
    });

    it('should not find the player and throws an exception', async () => {
      databaseMock.player.findUnique.mockResolvedValue(null);

      await expect(playerService.login(loginPlayerDTO)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not match the password and throws an exception', async () => {
      const player = {
        id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
        username: 'marcus',
        nickname: 'hehepotter',
        hashedPassword: await bcrypt.hash('hisnameisnotforbidden', 10),
        createdAt: new Date('2024-12-25T10:30:00Z'),
        updatedAt: new Date(),
      };

      databaseMock.player.findUnique.mockResolvedValue(player);

      await expect(playerService.login(loginPlayerDTO)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('Post Method - Player Creation', () => {
    const playerMock: CreatePlayerDTO = {
      nickname: 'Chalice',
      username: 'MontyPython',
      password: 'bl@ckKnight78',
    };

    it('should create a new player and return the tokens', async () => {
      const expectedReturn = {
        player: {
          id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
          ...omit(playerMock, ['password']),
          hashedPassword: await bcrypt.hash(playerMock.password, 10),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        accessToken: 'token',
        sessionToken: 'token',
      };

      databaseMock.player.create.mockResolvedValue(expectedReturn.player);
      tokenServiceMock.generateSessionTokens.mockResolvedValue({
        accessToken: 'token',
        sessionToken: 'token',
      });

      const result = await playerService.createPlayer(playerMock);

      expect(result).toEqual(expectedReturn);
      expect(tokenServiceMock.generateSessionTokens).toHaveBeenCalledWith(
        expectedReturn.player.id,
        playerMock.nickname,
      );
      expect(databaseMock.player.create).toHaveBeenCalledTimes(1);
    });

    it('should throw a database error', async () => {
      databaseMock.player.create.mockRejectedValue(new Error());

      await expect(playerService.createPlayer(playerMock)).rejects.toThrow();
    });
  });

  describe('Patch Method - Update Player', () => {
    const updatePlayerDTO: UpdatePlayerDTO = {
      nickname: 'hehepotter',
      password: 'hisnameisforbidden',
      username: 'marcus',
    };

    it('should hash the password before send it to the database and update the tokens', async () => {
      const expectedReturn = {
        player: {
          id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
          username: 'marcus',
          nickname: 'hehepotter',
          hashedPassword: await bcrypt.hash('hisnameisforbidden', 10),
          createdAt: new Date('2024-12-25T10:30:00Z'),
          updatedAt: new Date(),
        },
        accessToken: 'token',
        sessionToken: 'token',
      };

      databaseMock.player.update.mockResolvedValue(expectedReturn.player);
      tokenServiceMock.generateSessionTokens.mockResolvedValue({
        accessToken: 'token',
        sessionToken: 'token',
      });

      const result = await playerService.updatePlayer(
        expectedReturn.player.id,
        updatePlayerDTO,
      );

      expect(result).toEqual(expectedReturn);
      expect(tokenServiceMock.generateSessionTokens).toHaveBeenCalledWith(
        expectedReturn.player.id,
        updatePlayerDTO.nickname,
      );
      expect(databaseMock.player.update).toHaveBeenCalledTimes(1);
    });

    it('should throw an Error if player does not exist', async () => {
      databaseMock.player.update.mockRejectedValue(new Error());

      await expect(
        playerService.updatePlayer('unknownID', updatePlayerDTO),
      ).rejects.toThrow();
    });
  });

  describe('Delete Method - Delete Player', () => {
    it('should throw an Error if player does not exist', async () => {
      databaseMock.player.delete.mockRejectedValue(new Error());

      await expect(playerService.deletePlayer('unknownID')).rejects.toThrow();
    });
  });
});
