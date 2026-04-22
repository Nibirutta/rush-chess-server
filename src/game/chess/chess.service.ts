import { Injectable } from '@nestjs/common';
import { OnMatchAccepted } from 'src/common/event/domain.events';
import { DatabaseService } from 'src/database/database.service';
import { GameData } from '../interfaces/match.interface';
import { MatchID, PlayerRole } from '../types/game.types';
import { DomainEventEmitterService } from 'src/common/event/domain-event-emitter.service';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';
import { Chess, DEFAULT_POSITION, Square } from 'chess.js';
import {
  InvalidMovementException,
  MatchNotFoundException,
  PlayerCannotSurrenderException,
} from 'src/common/errors/match.errors';

@Injectable()
export class ChessService {
  private activeMatches: Map<MatchID, GameData> = new Map();
  private matchTimeout: Map<MatchID, NodeJS.Timeout> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {}

  async prepareMatch(payload: OnMatchAccepted) {
    const matchExpirationTimeInMS = 30000;
    const { playerAsWhite, playerAsBlack } = this.chooseSides(
      payload.challengerID,
      payload.opponentID,
    );

    this.activeMatches.set(payload.matchID, {
      matchID: payload.matchID,
      gameState: {
        matchState: 'waiting',
        fenHistory: [DEFAULT_POSITION],
      },
      playerAsWhite: {
        ID: playerAsWhite,
        connected: false,
      },
      playerAsBlack: {
        ID: playerAsBlack,
        connected: false,
      },
    });

    await this.databaseService.match.create({
      data: {
        id: payload.matchID,
        gameState: {
          create: {
            fenHistory: [DEFAULT_POSITION],
          },
        },
        playerWhite: {
          connect: {
            id: playerAsWhite,
          },
        },
        playerBlack: {
          connect: {
            id: playerAsBlack,
          },
        },
      },
    });

    const timeoutToExpireMatch = setTimeout(() => {
      void (async () => {
        try {
          this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED, {
            matchID: payload.matchID,
          });

          this.domainEventEmitter.emit(
            DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED,
            {
              playersInMatch: [playerAsWhite, playerAsBlack],
            },
          );

          this.activeMatches.delete(payload.matchID);
          await this.databaseService.match.delete({
            where: { id: payload.matchID },
          });
        } catch (error) {
          console.log(error);
        }
      })();
    }, matchExpirationTimeInMS);

    this.matchTimeout.set(payload.matchID, timeoutToExpireMatch);
  }

  private chooseSides(playerOneID: string, playerTwoID: string) {
    let playerAsWhite: string;
    let playerAsBlack: string;

    if (Math.random() >= 0.5) {
      playerAsWhite = playerOneID;
      playerAsBlack = playerTwoID;
    } else {
      playerAsBlack = playerOneID;
      playerAsWhite = playerTwoID;
    }

    return { playerAsWhite, playerAsBlack };
  }

  async connectToMatch(matchID: string, connectedPlayerID: string) {
    const ongoingMatch = await this.loadOngoingMatch(matchID);

    if (!ongoingMatch) return;

    const playerAsWhiteID = ongoingMatch.playerAsWhite.ID;
    const playerAsBlackID = ongoingMatch.playerAsBlack.ID;
    const role: PlayerRole =
      ongoingMatch.playerAsWhite.ID === connectedPlayerID ||
      ongoingMatch.playerAsBlack.ID === connectedPlayerID
        ? 'player'
        : 'spectator';

    switch (connectedPlayerID) {
      case playerAsWhiteID:
        ongoingMatch.playerAsWhite.connected = true;

        break;
      case playerAsBlackID:
        ongoingMatch.playerAsBlack.connected = true;

        break;
    }

    this.initiateMatchIfBothPlayersAreConnected(ongoingMatch);

    return {
      ongoingMatch: ongoingMatch,
      role: role,
    };
  }

  disconnectFromMatch(matchID: string, disconnectedPlayerID: string) {
    const ongoingMatch = this.activeMatches.get(matchID);

    if (!ongoingMatch) return;

    this.notifyIfOpponentDisconnectedDuringMatch(
      ongoingMatch,
      disconnectedPlayerID,
    );
  }

  private async loadOngoingMatch(matchID: string) {
    const ongoingMatch = this.activeMatches.get(matchID);

    if (!ongoingMatch) {
      const retrievedMatch = await this.databaseService.match.findUnique({
        where: { id: matchID },
        include: {
          gameState: true,
        },
      });

      if (!retrievedMatch || !retrievedMatch.gameState) return;
      if (retrievedMatch.status != 'STARTED') return;

      const retrievedOngoingMatch: GameData = {
        matchID: retrievedMatch.id,
        gameState: {
          matchState: 'paused',
          fenHistory: retrievedMatch.gameState.fenHistory,
        },
        playerAsWhite: {
          ID: retrievedMatch.playerWhiteID,
          connected: false,
        },
        playerAsBlack: {
          ID: retrievedMatch.playerBlackID,
          connected: false,
        },
      };

      this.activeMatches.set(retrievedMatch.id, retrievedOngoingMatch);

      return retrievedOngoingMatch;
    }

    return ongoingMatch;
  }

  private initiateMatchIfBothPlayersAreConnected(gameData: GameData) {
    if (
      gameData.playerAsWhite.connected &&
      gameData.playerAsBlack.connected &&
      gameData.gameState.matchState != 'started'
    ) {
      this.domainEventEmitter.emit(
        gameData.gameState.matchState === 'waiting'
          ? DOMAIN_EVENTS_PATTERN.ON_MATCH_START
          : DOMAIN_EVENTS_PATTERN.ON_MATCH_RESTART,
        {
          matchID: gameData.matchID,
        },
      );

      gameData.gameState.matchState = 'started';
      const timeoutToExpireMatch = this.matchTimeout.get(gameData.matchID);

      if (timeoutToExpireMatch) {
        clearTimeout(timeoutToExpireMatch);
        this.matchTimeout.delete(gameData.matchID);
      }
    }
  }

  private notifyIfOpponentDisconnectedDuringMatch(
    gameData: GameData,
    disconnectedPlayerID: string,
  ) {
    if (
      disconnectedPlayerID === gameData.playerAsWhite.ID ||
      disconnectedPlayerID === gameData.playerAsBlack.ID
    ) {
      const matchReconnectTimeoutMS = 30000;

      this.domainEventEmitter.emit(
        DOMAIN_EVENTS_PATTERN.ON_OPPONENT_DISCONNECTION,
        {
          disconnectedPlayer: disconnectedPlayerID,
          matchID: gameData.matchID,
        },
      );

      gameData.gameState.matchState = 'paused';

      const prevTimeoutToExpireMatch = this.matchTimeout.get(gameData.matchID);

      if (prevTimeoutToExpireMatch) clearTimeout(prevTimeoutToExpireMatch);

      const timeoutToExpireMatch = setTimeout(() => {
        void (async () => {
          try {
            await this.databaseService.match.update({
              where: { id: gameData.matchID },
              data: {
                status: 'ABANDONED',
                endedAt: new Date(),
              },
            });

            this.activeMatches.delete(gameData.matchID);

            this.domainEventEmitter.emit(
              DOMAIN_EVENTS_PATTERN.ON_MATCH_ABANDONED,
              {
                matchID: gameData.matchID,
              },
            );

            this.domainEventEmitter.emit(
              DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED,
              {
                playersInMatch: [
                  gameData.playerAsWhite.ID,
                  gameData.playerAsBlack.ID,
                ],
              },
            );
          } catch (error) {
            console.log(error);
          }
        })();
      }, matchReconnectTimeoutMS);

      this.matchTimeout.set(gameData.matchID, timeoutToExpireMatch);
    }
  }

  getAvailableMoves(matchID: string, piecePosition: Square) {
    const foundMatch = this.activeMatches.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    const chessState = new Chess(foundMatch.gameState.fenHistory.at(-1));

    const possibleMoves = chessState.moves({
      square: piecePosition,
      verbose: true,
    });

    return possibleMoves;
  }

  async makeMove(
    matchID: string,
    from: string,
    to: string,
    promotion?: string,
  ) {
    const foundMatch = this.activeMatches.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    try {
      const chessState = new Chess(foundMatch.gameState.fenHistory.at(-1));

      chessState.move(
        { from: from, to: to, promotion: promotion },
        { strict: true },
      );

      foundMatch.gameState.fenHistory.push(chessState.fen());

      await this.databaseService.gameState.update({
        where: { matchID: matchID },
        data: {
          fenHistory: {
            push: chessState.fen(),
          },
        },
      });

      return foundMatch;
    } catch {
      throw new InvalidMovementException('Invalid movement');
    }
  }

  verifyMatchCurrentState(gameData: GameData) {
    this.notifyIfThreefoldRepetitionOccuried(gameData);

    this.notifyIfPlayerInCheck(gameData);

    this.handleDrawConditions(gameData);

    this.handleCheckmateEndGame(gameData);
  }

  private notifyIfThreefoldRepetitionOccuried(gameData: GameData) {
    const wasThreefoldRepetition = this.wasThreefoldRepetitionOccuried(
      gameData.gameState.fenHistory,
    );

    if (wasThreefoldRepetition) {
      this.domainEventEmitter.emit(
        DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION,
        {
          matchID: gameData.matchID,
        },
      );
    }
  }

  private wasThreefoldRepetitionOccuried(fenHistory: string[]) {
    const repeatedPositionsMap = new Map<string, number>();

    for (const notation of fenHistory) {
      const chessPosition = notation.split(' ').at(0)!;
      const currentCount = repeatedPositionsMap.get(chessPosition) || 0;
      const newCount = currentCount + 1;

      if (newCount >= 3) return true;

      repeatedPositionsMap.set(chessPosition, newCount);
    }

    return false;
  }

  private notifyIfPlayerInCheck(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));

    if (chessState.isCheck()) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK, {
        playerID:
          chessState.turn() === 'w'
            ? gameData.playerAsWhite.ID
            : gameData.playerAsBlack.ID,
      });
    }
  }

  private handleDrawConditions(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));

    if (
      chessState.isDrawByFiftyMoves() ||
      chessState.isInsufficientMaterial() ||
      chessState.isStalemate()
    ) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_DRAW, {
        drawType: chessState.isDrawByFiftyMoves()
          ? 'Draw by fifty moves'
          : chessState.isInsufficientMaterial()
            ? 'Draw by insufficient materials'
            : 'Draw by stalemate',
        matchID: gameData.matchID,
      });

      this.activeMatches.delete(gameData.matchID);

      void this.databaseService.match.update({
        where: { id: gameData.matchID },
        data: { status: 'DRAW', endedAt: new Date() },
      });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED, {
        playersInMatch: [gameData.playerAsWhite.ID, gameData.playerAsBlack.ID],
      });
    }
  }

  private handleCheckmateEndGame(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));

    if (chessState.isCheckmate()) {
      const [winner, loser] = this.getWinnerAndLoser(gameData);

      this.activeMatches.delete(gameData.matchID);

      void this.databaseService.match.update({
        where: { id: gameData.matchID },
        data: {
          status: 'FINISHED',
          winner: {
            connect: {
              id: winner,
            },
          },
          loser: {
            connect: {
              id: loser,
            },
          },
          endedAt: new Date(),
        },
      });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_CHECKMATE, {
        matchID: gameData.matchID,
        winnerID: winner,
        loserID: loser,
      });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED, {
        playersInMatch: [gameData.playerAsWhite.ID, gameData.playerAsBlack.ID],
      });
    }
  }

  private getWinnerAndLoser(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));
    const currentTurn = chessState.turn();

    const [winner, loser] =
      currentTurn === 'b'
        ? [gameData.playerAsWhite.ID, gameData.playerAsBlack.ID]
        : [gameData.playerAsBlack.ID, gameData.playerAsWhite.ID];

    return [winner, loser];
  }

  async requestDraw(matchID: string) {
    const updatedMatch = await this.databaseService.match.update({
      where: {
        id: matchID,
      },
      data: {
        status: 'DRAW',
        endedAt: new Date(),
      },
    });

    this.activeMatches.delete(matchID);

    this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED, {
      playersInMatch: [updatedMatch.playerWhiteID, updatedMatch.playerBlackID],
    });
  }

  async requestSurrender(matchID: string, playerSurrendered: string) {
    const foundMatch = this.activeMatches.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    const playerAsWhite = foundMatch.playerAsWhite.ID;
    const playerAsBlack = foundMatch.playerAsBlack.ID;

    if (
      !(
        playerSurrendered === playerAsWhite ||
        playerSurrendered === playerAsBlack
      )
    )
      throw new PlayerCannotSurrenderException('Player cannot surrender');

    const [winner, loser] =
      playerAsWhite === playerSurrendered
        ? [playerAsBlack, playerAsWhite]
        : [playerAsWhite, playerAsBlack];

    const updatedMatch = await this.databaseService.match.update({
      where: {
        id: matchID,
      },
      data: {
        status: 'FINISHED',
        winner: {
          connect: {
            id: winner,
          },
        },
        loser: {
          connect: {
            id: loser,
          },
        },
        endedAt: new Date(),
      },
    });

    this.activeMatches.delete(matchID);

    this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_TERMINATED, {
      playersInMatch: [playerAsWhite, playerAsBlack],
    });

    return updatedMatch;
  }

  canLeave(matchID: string, playerID: string): boolean {
    const ongoingMatch = this.activeMatches.get(matchID);

    if (!ongoingMatch) return true;

    if (
      ongoingMatch.playerAsWhite.ID === playerID ||
      ongoingMatch.playerAsBlack.ID === playerID
    ) {
      return false;
    }

    return true;
  }
}
