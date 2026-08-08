import { Test, TestingModule } from '@nestjs/testing';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PlayerService } from './player.service';
import { TokenService, DatabaseService } from '@app/common';

describe('PlayerService', () => {
  let playerService: PlayerService;
  let tokenServiceMock: DeepMockProxy<TokenService>;
  let databaseMock: DeepMockProxy<DatabaseService>;

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
});
