import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { MatchService } from './match.service';
import { DatabaseService, DomainEventEmitterService } from '@app/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('ChessService', () => {
  let matchService: MatchService;
  let databaseService: DeepMockProxy<DatabaseService>;
  let domainEventEmitter: DeepMockProxy<DomainEventEmitterService>;

  beforeEach(async () => {
    databaseService = mockDeep<DatabaseService>();
    domainEventEmitter = mockDeep<DomainEventEmitterService>();

    jest.useFakeTimers();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchService,
        {
          provide: DomainEventEmitterService,
          useValue: domainEventEmitter,
        },
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile();

    matchService = module.get<MatchService>(MatchService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(matchService).toBeDefined();
  });
});
