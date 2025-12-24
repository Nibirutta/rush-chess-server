import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PlayerService } from './player.service';
import { DatabaseService } from 'src/database/database.service';
import { CreatePlayerDTO } from '../contracts/create-player.dto';
import { omit } from 'lodash';
import * as bcrypt from 'bcrypt';

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
      nickname: 'MontyPython',
      username: 'Chalice',
      password: 'bikku$$D@ck$78',
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
      databaseMock.player.create.mockRejectedValue(new Error('Database error'));

      await expect(playerService.createPlayer(playerMock)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
