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
          this.activeMatches.delete(payload.matchID);
          await this.databaseService.match.delete({
            where: { id: payload.matchID },
          });
          this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED, {
            matchID: payload.matchID,
          });
        } catch (error) {
          console.log(error);
        }
      });
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
      gameState: {},
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
      FEN: createdMatch.gameState!.FEN.at(0)!,
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

  async verifyIfMatchIsActive(matchID: MatchID) {
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
          FEN: retrivedMatch.gameState!.FEN.at(-1)!,
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
      const chessState = new Chess(foundMatch.gameState.FEN);

      chessState.move(
        { from: from, to: to, promotion: promotion },
        { strict: true },
      );

      foundMatch.gameState.FEN = chessState.fen();

      const updatedGameState = await this.databaseService.gameState.update({
        where: { matchID: matchID },
        data: {
          FEN: {
            push: foundMatch.gameState.FEN,
          },
        },
      });

      // TODO - make all verify methods to be executed only after move to avoid race conditions

      this.notifyIfThreefoldRepetitionOccuried(updatedGameState.FEN, matchID);

      this.notifyIfPlayerInCheck(
        chessState,
        foundMatch.playerAsWhite,
        foundMatch.playerAsBlack,
      );

      this.handleDrawConditions(chessState, matchID);

      this.handleCheckmateEndGame(chessState, foundMatch);

      return foundMatch;
    } catch {
      throw new InvalidMovementException('Invalid movement, try it again');
    }
  }

  notifyIfThreefoldRepetitionOccuried(FEN: string[], matchID: string) {
    const wasThreefoldRepetition = this.wasThreefoldRepetitionOccuried(FEN);

    if (wasThreefoldRepetition) {
      this.domainEventEmitter.emit(
        DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION,
        {
          matchID: matchID,
        },
      );
    }
  }

  wasThreefoldRepetitionOccuried(FEN: string[]) {
    const singles = new Set();
    const duplicates = new Set();

    for (const notation of FEN) {
      const chessPosition = notation.split(' ').at(0);

      if (!singles.has(chessPosition)) {
        singles.add(chessPosition);
      } else {
        duplicates.add(chessPosition);
      }

      if (duplicates.size >= 3) {
        return true;
      }
    }

    return false;
  }

  notifyIfPlayerInCheck(
    chessState: Chess,
    playerAsWhite: string,
    playerAsBlack: string,
  ) {
    if (chessState.isCheck()) {
      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK, {
        playerID: chessState.turn() === 'w' ? playerAsWhite : playerAsBlack,
      });
    }
  }

  handleDrawConditions(chessState: Chess, matchID: string) {
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
        matchID: matchID,
      });

      this.activeMatches.delete(matchID);

      void this.databaseService.match.update({
        where: { id: matchID },
        data: { status: 'FINISHED', endedAt: new Date() },
      });
    }
  }

  handleCheckmateEndGame(chessState: Chess, gameData: GameData) {
    if (chessState.isCheckmate()) {
      const [winner, loser] = this.getWinnerAndLoser(
        chessState.turn(),
        gameData,
      );

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

  getWinnerAndLoser(currentTurn: 'b' | 'w', gameData: GameData) {
    const [winner, loser] =
      currentTurn === 'b'
        ? [gameData.playerAsWhite, gameData.playerAsBlack]
        : [gameData.playerAsBlack, gameData.playerAsWhite];

    return [winner, loser];
  }
}

// TODO - verify why the timeout it is not working
// TODO - change the logic behavior in the threefold repetition
// TODO - improve code readability
