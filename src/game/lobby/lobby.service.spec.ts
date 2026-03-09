import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { LobbyService } from './lobby.service';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from 'src/database/database.service';
import { PlayerSocketData } from 'src/common/interfaces/socket-data.interface';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';

describe('LobbyService', () => {
  let lobbyService: LobbyService;
  let eventEmitterMock: DeepMockProxy<EventEmitter2>;
  let databaseMock: DeepMockProxy<DatabaseService>;

  beforeEach(async () => {
    eventEmitterMock = mockDeep<EventEmitter2>();
    databaseMock = mockDeep<DatabaseService>();

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyService,
        { provide: EventEmitter2, useValue: eventEmitterMock },
        { provide: DatabaseService, useValue: databaseMock },
      ],
    }).compile();

    lobbyService = module.get<LobbyService>(LobbyService);
  });

  it('should be defined', () => {
    expect(lobbyService).toBeDefined();
  });

  describe('playerConnected & playerDisconnected', () => {
    const playerSocketData: PlayerSocketData = {
      playerID: 'playerID',
      nickname: 'player1',
    };

    const socketID: string = 'socketID';

    it('should add the player to the map after connection', () => {
      lobbyService.playerConnected(playerSocketData, socketID);

      const result = lobbyService.getOnlinePlayers();

      expect(result).toHaveLength(1);
    });

    it('should remove the player from the map after disconnection', () => {
      lobbyService.playerConnected(playerSocketData, socketID);
      lobbyService.playerDisconnected(playerSocketData);

      const result = lobbyService.getOnlinePlayers();

      expect(result).toHaveLength(0);
    });
  });

  describe('getMessages', () => {
    const paginationPropertiesDTO: PaginationPropertiesDTO = {
      amount: 1,
      skip: 0,
    };

    it('should return only the message content', async () => {
      const allMessagesFound = [
        {
          playerID: 'playerID',
          id: 1,
          content: 'message',
          createdAt: new Date(),
        },
      ];

      databaseMock.message.findMany.mockResolvedValue(allMessagesFound);

      const result = await lobbyService.getMessages(paginationPropertiesDTO);

      const expected = [allMessagesFound[0].content];

      expect(result).toEqual(expected);
    });
  });
});
