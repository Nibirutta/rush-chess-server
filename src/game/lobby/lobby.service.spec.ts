import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { LobbyService } from './lobby.service';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseService } from 'src/database/database.service';
import { PlayerSocketData } from 'src/common/interfaces/socket-data.interface';
import { PaginationPropertiesDTO } from '../dto/pagination-properties.dto';
import {
  INVITE_EVENTS_PATTERN,
  PLAYER_EVENTS_PATTERN,
} from '../events/events.pattern';
import { PlayerLobbyStatus } from '../interfaces/player-on-lobby.interface';

describe('LobbyService', () => {
  let lobbyService: LobbyService;
  let eventEmitterMock: DeepMockProxy<EventEmitter2>;
  let databaseMock: DeepMockProxy<DatabaseService>;

  beforeEach(async () => {
    eventEmitterMock = mockDeep<EventEmitter2>();
    databaseMock = mockDeep<DatabaseService>();

    jest.useFakeTimers();
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(lobbyService).toBeDefined();
  });

  describe('player connection', () => {
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

  describe('messages', () => {
    it('should return only the message content', async () => {
      const paginationPropertiesDTO: PaginationPropertiesDTO = {
        amount: 1,
        skip: 0,
      };

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

      expect(result).toStrictEqual(expected);
    });
  });

  describe('invitation', () => {
    const challengerID = 'playerID-123';
    const opponentID = 'playerID-456';

    it('should invite the opponent successfully', () => {
      lobbyService.playerConnected(
        { playerID: challengerID, nickname: 'PlayerOne' },
        'socket1',
      );

      lobbyService.playerConnected(
        { playerID: opponentID, nickname: 'PlayerTwo' },
        'socket2',
      );

      const emitSpy = jest.spyOn(eventEmitterMock, 'emit');

      const result = lobbyService.invite(challengerID, opponentID);

      const players = lobbyService.getOnlinePlayers();

      players.forEach((player) => {
        expect(player.status).toBe(PlayerLobbyStatus.Awaiting);
      });

      expect(result).toBeDefined();
      expect(result.opponentSocketID).toStrictEqual('socket2');
      expect(emitSpy).toHaveBeenCalledWith(
        PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
        expect.anything(),
      );
    });

    it('should expire the invite after 15 seconds', () => {
      lobbyService.playerConnected(
        { playerID: challengerID, nickname: 'PlayerOne' },
        'socket1',
      );

      lobbyService.playerConnected(
        { playerID: opponentID, nickname: 'PlayerTwo' },
        'socket2',
      );

      const emitSpy = jest.spyOn(eventEmitterMock, 'emit');

      lobbyService.invite(challengerID, opponentID);

      jest.advanceTimersByTime(15000);

      const players = lobbyService.getOnlinePlayers();

      players.forEach((player) => {
        expect(player.status).toBe(PlayerLobbyStatus.Ready);
      });

      expect(emitSpy).toHaveBeenCalledWith(
        INVITE_EVENTS_PATTERN.ON_INVITE_EXPIRED,
        expect.anything(),
      );
    });
  });
});
