import { Injectable } from '@nestjs/common';
import { OnMatchAccepted } from 'src/common/event/domain.events';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { GameData, GameState } from '../interfaces/match.interface';
import { MatchID } from '../types/game.types';
import { DomainEventEmitterService } from 'src/common/event/domain-event-emitter.service';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';
import { Chess } from 'chess.js';
import {
  InvalidMovementException,
  MatchNotFoundException,
} from 'src/common/errors/match.errors';

@Injectable()
export class ChessService {
  private activeMatches: Map<MatchID, GameData> = new Map();
  private matchTimeout: Map<MatchID, NodeJS.Timeout> = new Map();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {}

  async createMatch(payload: OnMatchAccepted) {
    const matchExpirationTimeInMS = 30000;
    const { playerAsWhite, playerAsBlack } = this.chooseSides(
      payload.challengerID,
      payload.opponentID,
    );

    await this.initializeMatchData(
      payload.matchID,
      playerAsWhite,
      playerAsBlack,
    );

    const timeoutToExpireMatch = setTimeout(() => {
      void (async () => {
        try {
          this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED, {
            matchID: payload.matchID,
          });

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

  private async initializeMatchData(
    matchID: string,
    playerAsWhite: string,
    playerAsBlack: string,
  ) {
    const matchData: Prisma.MatchCreateInput = {
      gameState: {
        create: {},
      },
      id: matchID,
      playerBlack: {
        connect: {
          id: playerAsBlack,
        },
      },
      playerWhite: {
        connect: {
          id: playerAsWhite,
        },
      },
    };

    const createdMatch = await this.databaseService.match.create({
      data: matchData,
      include: {
        gameState: true,
      },
    });

    const gameState: GameState = {
      fenHistory: createdMatch.gameState!.FEN,
    };

    this.activeMatches.set(matchData.id, {
      matchID: matchID,
      gameState: gameState,
      playerAsWhite: playerAsWhite,
      playerAsBlack: playerAsBlack,
    });

    return matchData;
  }

  startMatch(matchID: string) {
    void this.databaseService.match.update({
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
      where: { id: matchID },
    });

    const timeoutToExpireMatch = this.matchTimeout.get(matchID);

    if (timeoutToExpireMatch) {
      clearTimeout(timeoutToExpireMatch);
      this.matchTimeout.delete(matchID);
    }

    return this.activeMatches.get(matchID);
  }

  async loadMatchIfActive(matchID: MatchID) {
    const activeMatch = this.activeMatches.get(matchID);

    if (!activeMatch) {
      const retrivedMatch = await this.databaseService.match.findUnique({
        where: { id: matchID },
        include: {
          gameState: true,
        },
      });

      if (!retrivedMatch) return false;
      if (
        retrivedMatch.status === 'FINISHED' ||
        retrivedMatch.status === 'ABANDONED'
      )
        return false;

      const retrievedActiveMatch: GameData = {
        matchID: retrivedMatch.id,
        gameState: {
          fenHistory: retrivedMatch.gameState!.FEN,
        },
        playerAsWhite: retrivedMatch.playerWhiteID,
        playerAsBlack: retrivedMatch.playerBlackID,
      };

      this.activeMatches.set(retrivedMatch.id, retrievedActiveMatch);

      return true;
    }

    return true;
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
          FEN: {
            push: chessState.fen(),
          },
        },
      });

      return foundMatch;
    } catch {
      throw new InvalidMovementException('Invalid movement, try it again');
    }
  }

  verifyMatchCurrentState(gameData: GameData) {
    this.notifyIfThreefoldRepetitionOccuried(gameData);

    this.notifyIfPlayerInCheck(gameData);

    this.handleDrawConditions(gameData);

    this.handleCheckmateEndGame(gameData);
  }

  notifyIfThreefoldRepetitionOccuried(gameData: GameData) {
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

  wasThreefoldRepetitionOccuried(fenHistory: string[]) {
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

  notifyIfPlayerInCheck(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));

    if (chessState.isCheck()) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK, {
        playerID:
          chessState.turn() === 'w'
            ? gameData.playerAsWhite
            : gameData.playerAsBlack,
      });
    }
  }

  handleDrawConditions(gameData: GameData) {
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
        data: { status: 'FINISHED', endedAt: new Date() },
      });
    }
  }

  handleCheckmateEndGame(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));

    if (chessState.isCheckmate()) {
      const [winner, loser] = this.getWinnerAndLoser(gameData);

      this.activeMatches.delete(gameData.matchID);

      void this.databaseService.match.update({
        where: { id: gameData.matchID },
        data: {
          status: 'FINISHED',
          winnerID: winner,
          loserID: loser,
          endedAt: new Date(),
        },
      });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_CHECKMATE, {
        matchID: gameData.matchID,
        winnerID: winner,
        loserID: loser,
      });
    }
  }

  getWinnerAndLoser(gameData: GameData) {
    const chessState = new Chess(gameData.gameState.fenHistory.at(-1));
    const currentTurn = chessState.turn();

    const [winner, loser] =
      currentTurn === 'b'
        ? [gameData.playerAsWhite, gameData.playerAsBlack]
        : [gameData.playerAsBlack, gameData.playerAsWhite];

    return [winner, loser];
  }
}
