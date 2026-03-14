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
import {
  InvalidOpponentError,
  PlayerIsOfflineError,
  SessionNotFoundError,
} from 'src/common/errors/lobby.errors';
import { InviteTicket } from '../dto/invite.dto';

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

  describe('getMessages & createMessage', () => {
    it('should return only the message content', async () => {
      const paginationPropertiesDTO: PaginationPropertiesDTO = {
        amount: 1,
        skip: 0,
      };

      const mockedMessages = [
        {
          playerID: 'playerID',
          id: 1,
          content: 'message',
          createdAt: new Date(),
        },
      ];

      databaseMock.message.findMany.mockResolvedValue(mockedMessages);

      const result = await lobbyService.getMessages(paginationPropertiesDTO);

      const expected = [mockedMessages[0].content];

      expect(result).toStrictEqual(expected);
    });

    it('should format the message before save it to the database', async () => {
      const messageContent = 'Hello [world]';
      const playerID = 'playerID';
      const nickname = 'nickname';

      // making use of mock implementation to pass the parameter as returned value
      databaseMock.message.create.mockImplementation((value) => {
        // eslint-disable-next-line
        return value.data as any;
      });

      const result = await lobbyService.createMessage(
        { content: messageContent },
        playerID,
        nickname,
      );

      expect(result.content).toStrictEqual(`[${nickname}] - Hello world`);
    });
  });

  describe('invite, invite timeout & resolve invite', () => {
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

      expect(emitSpy).toHaveBeenCalledWith(
        PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
        expect.anything(),
      );
      const players = lobbyService.getOnlinePlayers();
      players.forEach((player) => {
        expect(player.status).toBe(PlayerLobbyStatus.Awaiting);
      });

      expect(result).toBeInstanceOf(InviteTicket);
      expect(result.opponentSocketID).toStrictEqual('socket2');
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

      expect(emitSpy).toHaveBeenCalledWith(
        PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
        expect.anything(),
      );
      const players = lobbyService.getOnlinePlayers();
      players.forEach((player) => {
        expect(player.status).toBe(PlayerLobbyStatus.Ready);
      });

      expect(emitSpy).toHaveBeenCalledWith(
        INVITE_EVENTS_PATTERN.ON_INVITE_EXPIRED,
        expect.anything(),
      );
    });

    it('should throw PlayerIsOfflineError if opponent is not online', () => {
      expect(() =>
        lobbyService.invite(challengerID, 'opponent-is-offline'),
      ).toThrow(PlayerIsOfflineError);
    });

    it('should throw InvalidOpponentError if opponent is not ready or the ID is invalid', () => {
      lobbyService.playerConnected(
        { playerID: challengerID, nickname: 'PlayerOne' },
        'socket1',
      );

      lobbyService.playerConnected(
        { playerID: opponentID, nickname: 'PlayerTwo' },
        'socket2',
      );

      lobbyService.isPlayerReady(opponentID, false);

      expect(() => lobbyService.invite(challengerID, opponentID)).toThrow(
        InvalidOpponentError,
      );
    });

    it('should accept the invitation and start the battle', () => {
      lobbyService.playerConnected(
        { playerID: challengerID, nickname: 'PlayerOne' },
        'socket1',
      );

      lobbyService.playerConnected(
        { playerID: opponentID, nickname: 'PlayerTwo' },
        'socket2',
      );

      const invitation = lobbyService.invite(challengerID, opponentID);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const emitSpy = jest.spyOn(eventEmitterMock, 'emit');

      emitSpy.mockClear();

      lobbyService.resolveInvite(invitation.waitRoomID, true);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
        expect.anything(),
      );
      expect(emitSpy).toHaveBeenCalledTimes(2);
      const players = lobbyService.getOnlinePlayers();
      players.forEach((player) =>
        expect(player.status).toBe(PlayerLobbyStatus.On_Battle),
      );
    });

    it('should refuse the invitation and become ready to be invited again', () => {
      lobbyService.playerConnected(
        { playerID: challengerID, nickname: 'PlayerOne' },
        'socket1',
      );

      lobbyService.playerConnected(
        { playerID: opponentID, nickname: 'PlayerTwo' },
        'socket2',
      );

      const invitation = lobbyService.invite(challengerID, opponentID);
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const emitSpy = jest.spyOn(eventEmitterMock, 'emit');

      emitSpy.mockClear();

      lobbyService.resolveInvite(invitation.waitRoomID, false);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        PLAYER_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED,
        expect.anything(),
      );
      expect(emitSpy).toHaveBeenCalledTimes(2);
      const players = lobbyService.getOnlinePlayers();
      players.forEach((player) =>
        expect(player.status).toBe(PlayerLobbyStatus.Ready),
      );
    });

    it('should throw SessionNotFoundError if dont match any session ID', () => {
      expect(() =>
        lobbyService.resolveInvite('non-available-session-id', true),
      ).toThrow(SessionNotFoundError);
    });
  });
});
