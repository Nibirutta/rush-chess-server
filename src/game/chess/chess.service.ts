import { Injectable } from '@nestjs/common';
import { OnMatchAccepted } from 'src/common/event/domain.events';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { GameData, GameState } from '../interfaces/match.interface';
import { MatchID } from '../types/game.types';
import { DomainEventEmitterService } from 'src/common/event/domain-event-emitter.service';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';

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
      gameState: {
        create: {
          FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        },
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
      FEN: createdMatch.gameState!.FEN,
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
      data: { status: 'IN_PROGRESS' },
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

      console.log(retrivedMatch);

      const retrievedActiveMatch: GameData = {
        matchID: retrivedMatch.id,
        gameState: {
          FEN: retrivedMatch.gameState!.FEN,
        },
        playerAsWhite: retrivedMatch.playerWhiteID,
        playerAsBlack: retrivedMatch.playerBlackID,
      };

      this.activeMatches.set(retrivedMatch.id, retrievedActiveMatch);

      return true;
    }

    return true;
  }
}
