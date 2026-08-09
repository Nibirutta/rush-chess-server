import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { LobbyService } from './lobby.service';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService, DomainEventEmitterService } from '@app/common';

describe('LobbyService', () => {
  let lobbyService: LobbyService;
  let domainEventEmitterMock: DeepMockProxy<DomainEventEmitterService>;
  let databaseMock: DeepMockProxy<DatabaseService>;

  beforeEach(async () => {
    domainEventEmitterMock = mockDeep<DomainEventEmitterService>();
    databaseMock = mockDeep<DatabaseService>();

    jest.useFakeTimers();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyService,
        {
          provide: DomainEventEmitterService,
          useValue: domainEventEmitterMock,
        },
        { provide: DatabaseService, useValue: databaseMock },
      ],
    }).compile();

    lobbyService = module.get<LobbyService>(LobbyService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(lobbyService).toBeDefined();
  });
});
