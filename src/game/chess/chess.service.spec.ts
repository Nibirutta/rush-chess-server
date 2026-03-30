import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { ChessService } from './chess.service';
import { DatabaseService } from 'src/database/database.service';
import { DomainEventEmitterService } from 'src/common/event/domain-event-emitter.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('ChessService', () => {
  let chessService: ChessService;
  let databaseService: DeepMockProxy<DatabaseService>;
  let domainEventEmitter: DeepMockProxy<DomainEventEmitterService>;

  beforeEach(async () => {
    databaseService = mockDeep<DatabaseService>();
    domainEventEmitter = mockDeep<DomainEventEmitterService>();

    jest.useFakeTimers();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChessService,
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

    chessService = module.get<ChessService>(ChessService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(chessService).toBeDefined();
  });
});
