import { Injectable } from '@nestjs/common';
import { OnMatchAccepted } from 'src/common/event/domain.events';
import { DatabaseService } from 'src/database/database.service';
import { Prisma } from 'src/generated/prisma/client';
import { GameData, GameState } from '../interfaces/match.interface';

@Injectable()
export class ChessService {
  private matchesGoingOn: Map<string, GameData> = new Map();

  constructor(private readonly databaseService: DatabaseService) {}

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
    const initialGameState: GameState = {
      FENcode: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    };

    const matchData: Prisma.MatchCreateInput = {
      gameState: JSON.stringify(initialGameState),
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

    await this.databaseService.match.create({
      data: matchData,
    });

    this.matchesGoingOn.set(matchData.id, {
      gameState: initialGameState,
      playerAsWhite: playerAsWhite,
      playerAsBlack: playerAsBlack,
    });

    return matchData;
  }

  async createMatch(payload: OnMatchAccepted) {
    const { playerAsWhite, playerAsBlack } = this.chooseSides(
      payload.challengerID,
      payload.opponentID,
    );

    await this.initializeMatchData(
      payload.matchID,
      playerAsWhite,
      playerAsBlack,
    );
  }
}
