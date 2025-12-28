import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PlayerService } from './player.service';
import { DatabaseService } from 'src/database/database.service';
import { CreatePlayerDTO } from './contracts/create-player.dto';
import { omit } from 'lodash';
import * as bcrypt from 'bcrypt';
import { UpdatePlayerDTO } from './contracts/update-player.dto';
import { Player } from 'src/generated/prisma/client';

describe('PlayerService', () => {
  let playerService: PlayerService;
  let databaseMock: DeepMockProxy<DatabaseService>;

  beforeEach(async () => {
    databaseMock = mockDeep<DatabaseService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerService,
        {
          provide: DatabaseService,
          useValue: databaseMock,
        },
      ],
    }).compile();

    playerService = module.get<PlayerService>(PlayerService);
  });

  it('should be defined', () => {
    expect(playerService).toBeDefined();
  });

  describe('Post Method - Player Creation', () => {
    const playerMock: CreatePlayerDTO = {
      nickname: 'Chalice',
      username: 'MontyPython',
      password: 'bl@ckKnight78',
    };

    it('should create a new player', async () => {
      const expectedReturn = {
        id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
        ...omit(playerMock, ['password']),
        hashedPassword: await bcrypt.hash(playerMock.password, 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseMock.player.create.mockResolvedValue(expectedReturn);

      const result = await playerService.createPlayer(playerMock);

      expect(result).toEqual(expectedReturn);
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

    it('should hash the password before send it to the database', async () => {
      const expectedReturn = {
        id: 'f22c1dad-6f5e-4cb0-a600-750f4d1fd976',
        username: 'marcus',
        nickname: 'hehepotter',
        hashedPassword: await bcrypt.hash('hisnameisforbidden', 10),
        createdAt: new Date('2024-12-25T10:30:00Z'),
        updatedAt: new Date(),
      };

      databaseMock.player.update.mockResolvedValue(expectedReturn);

      const result = await playerService.updatePlayer(
        expectedReturn.id,
        updatePlayerDTO,
      );

      expect(result).toEqual(expectedReturn);
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
