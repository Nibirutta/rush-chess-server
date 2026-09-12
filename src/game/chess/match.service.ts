import { Injectable } from '@nestjs/common';
import {
  DatabaseService,
  DomainEventEmitterService,
  DOMAIN_EVENTS_PATTERN,
  InvalidMovementException,
  MatchNotFoundException,
  DrawType,
  OngoingMatchData,
  CannotRequestDrawException,
} from '@app/common';
import { MatchJob } from '../queues/match.jobs';
import { Chess, DEFAULT_POSITION, Square } from 'chess.js';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  MATCH_ABANDONED_JOB,
  MATCH_QUEUES,
  MATCH_EXPIRE_JOB,
} from '../queues/game-queues.constants';
import { MatchRepository } from './match.repository';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class MatchService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
    @InjectQueue(MATCH_QUEUES)
    private readonly matchQueues: Queue<MatchJob>,
    private readonly matchRepository: MatchRepository,
  ) {}

  async prepareMatch(
    matchID: string,
    challengerID: string,
    opponentID: string,
  ): Promise<void> {
    const matchExpirationTimeInMS = 120000; // 2 minutes
    const { playerAsWhiteID, playerAsBlackID } = this.chooseSides(
      challengerID,
      opponentID,
    );
    const matchCreateInput: Prisma.MatchCreateInput = {
      id: matchID,
      gameState: {
        create: {
          fenHistory: [DEFAULT_POSITION],
        },
      },
      playerWhite: {
        connect: {
          id: playerAsWhiteID,
        },
      },
      playerBlack: {
        connect: {
          id: playerAsBlackID,
        },
      },
    };

    await this.matchRepository.save(matchID, {
      matchID: matchID,
      matchState: 'waiting',
      fenHistory: [DEFAULT_POSITION],
      turn: 'w',
      playerWhiteID: playerAsWhiteID,
      isWhiteConnected: false,
      playerBlackID: playerAsBlackID,
      isBlackConnected: false,
      drawAvailable: false,
    });

    await this.databaseService.match.create({ data: matchCreateInput });

    await this.matchQueues.add(
      MATCH_EXPIRE_JOB,
      {
        matchID: matchID,
        playerAsWhiteID: playerAsWhiteID,
        playerAsBlackID: playerAsBlackID,
        fenHistory: [DEFAULT_POSITION],
      },
      {
        jobId: matchID,
        delay: matchExpirationTimeInMS,
        removeOnComplete: true,
      },
    );
  }

  private chooseSides(
    playerOneID: string,
    playerTwoID: string,
  ): { playerAsWhiteID: string; playerAsBlackID: string } {
    const mathDice = Math.random();
    const playerAsWhiteID: string = mathDice >= 0.5 ? playerOneID : playerTwoID;
    const playerAsBlackID: string = mathDice >= 0.5 ? playerTwoID : playerOneID;

    return { playerAsWhiteID, playerAsBlackID };
  }

  async connectToMatch(
    matchID: string,
    connectedPlayerID: string,
  ): Promise<OngoingMatchData | undefined> {
    const ongoingMatch = await this.matchRepository.get(matchID);

    if (!ongoingMatch) return;

    const { playerWhiteID, playerBlackID, spectators } = ongoingMatch;
    const updatedSpectators: string[] = spectators ? spectators : [];

    if (playerWhiteID === connectedPlayerID) {
      await this.matchRepository.update(matchID, {
        isWhiteConnected: true,
      });

      await this.initiateMatchIfBothPlayersAreConnected(matchID);
    } else if (playerBlackID === connectedPlayerID) {
      await this.matchRepository.update(matchID, {
        isBlackConnected: true,
      });

      await this.initiateMatchIfBothPlayersAreConnected(matchID);
    } else if (!updatedSpectators.includes(connectedPlayerID)) {
      updatedSpectators.push(connectedPlayerID);

      await this.matchRepository.update(matchID, {
        spectators: updatedSpectators,
      });
    }

    const updatedMatch = await this.matchRepository.get(matchID);

    return updatedMatch;
  }

  private async initiateMatchIfBothPlayersAreConnected(
    matchID: string,
  ): Promise<void> {
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) return;

    const { isWhiteConnected, isBlackConnected, matchState } = foundMatch;

    if (isWhiteConnected && isBlackConnected && matchState === 'waiting') {
      const expirationJob = await this.matchQueues.getJob(matchID);

      if (expirationJob) await expirationJob.remove();

      await this.matchRepository.update(matchID, {
        matchState: 'started',
      });

      await this.databaseService.match
        .update({
          where: { id: matchID },
          data: { status: 'STARTED' },
        })
        .catch(() => {
          throw new MatchNotFoundException('Update failed, match not found');
        });
    }
  }

  async disconnectFromMatch(
    matchID: string,
    disconnectedPlayerID: string,
  ): Promise<void> {
    const ongoingMatch = await this.matchRepository.get(matchID);

    if (!ongoingMatch) return;

    const { playerWhiteID, playerBlackID, spectators } = ongoingMatch;

    if (
      disconnectedPlayerID === playerWhiteID ||
      disconnectedPlayerID === playerBlackID
    ) {
      await this.notifyOpponentDisconnection(
        ongoingMatch,
        disconnectedPlayerID,
      );
    } else if (spectators && spectators.includes(disconnectedPlayerID)) {
      const updatedSpectators = spectators.filter(
        (spectator) => spectator !== disconnectedPlayerID,
      );

      await this.matchRepository.update(matchID, {
        spectators: updatedSpectators,
      });
    }
  }

  private async notifyOpponentDisconnection(
    gameData: OngoingMatchData,
    disconnectedPlayerID: string,
  ): Promise<void> {
    const { matchID, playerWhiteID, playerBlackID, fenHistory } = gameData;
    const matchReconnectTimeoutMS = 30000;

    if (playerWhiteID === disconnectedPlayerID) {
      await this.matchRepository.update(matchID, {
        matchState: 'waiting',
        isWhiteConnected: false,
      });
    } else {
      await this.matchRepository.update(matchID, {
        matchState: 'waiting',
        isBlackConnected: false,
      });
    }

    this.databaseService.match
      .update({
        where: { id: matchID },
        data: { status: 'WAITING' },
      })
      .catch(() => {
        throw new MatchNotFoundException('Update failed, match not found');
      });

    const prevExpirationJob = await this.matchQueues.getJob(matchID);

    if (!prevExpirationJob) {
      await this.matchQueues.add(
        MATCH_ABANDONED_JOB,
        {
          matchID: matchID,
          playerAsWhiteID: playerWhiteID,
          playerAsBlackID: playerBlackID,
          fenHistory: fenHistory,
        },
        {
          jobId: matchID,
          delay: matchReconnectTimeoutMS,
          removeOnComplete: true,
        },
      );
    }
  }

  async getAvailableMoves(
    matchID: string,
    selectedPosition: Square,
  ): Promise<string[]> {
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    const chessState = new Chess(foundMatch.fenHistory.at(-1));

    const availableMoves = chessState.moves({
      square: selectedPosition,
    });

    return availableMoves;
  }

  async makeMove(
    matchID: string,
    from: string,
    to: string,
    promotion?: string,
  ): Promise<void> {
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    const { fenHistory, playerWhiteID, playerBlackID } = foundMatch;
    const lastPosition = foundMatch.fenHistory.at(-1);
    const chessState = new Chess(lastPosition);

    try {
      chessState.move(
        { from: from, to: to, promotion: promotion },
        { strict: true },
      );
    } catch {
      throw new InvalidMovementException('Invalid movement');
    }

    const updatedFen = [...fenHistory, chessState.fen()];

    await this.matchRepository.update(matchID, {
      fenHistory: updatedFen,
    });

    const isCheckmate = await this.handleCheckmate(
      matchID,
      playerWhiteID,
      playerBlackID,
      updatedFen,
    );

    if (isCheckmate) return;

    const isDraw = await this.handleDrawConditions(
      matchID,
      playerWhiteID,
      playerBlackID,
      updatedFen,
    );

    if (isDraw) return;

    if (!foundMatch.drawAvailable)
      await this.checkIfThreefoldRepetitionOccuried(matchID, updatedFen);

    this.checkIfPlayerInCheck(matchID, updatedFen);

    await this.matchRepository.update(matchID, { turn: chessState.turn() });
  }

  private async handleCheckmate(
    matchID: string,
    playerWhiteID: string,
    playerBlackID: string,
    fenHistory: string[],
  ): Promise<boolean> {
    const chessState = new Chess(fenHistory.at(-1));

    if (chessState.isCheckmate()) {
      const [winner, loser] =
        chessState.turn() === 'w'
          ? [playerBlackID, playerWhiteID]
          : [playerWhiteID, playerBlackID];

      await this.databaseService.match
        .update({
          where: { id: matchID },
          data: {
            gameState: {
              update: {
                fenHistory: fenHistory,
              },
            },
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
        })
        .catch(() => {
          throw new MatchNotFoundException('Update failed, match not found');
        });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
        matchID: matchID,
        reason: 'Checkmate',
        winnerID: winner,
        loserID: loser,
        playerIDs: [playerWhiteID, playerBlackID],
      });

      await this.matchRepository.delete(matchID);

      return true;
    }

    return false;
  }

  private async handleDrawConditions(
    matchID: string,
    playerWhiteID: string,
    playerBlackID: string,
    fenHistory: string[],
  ): Promise<boolean> {
    const chessState = new Chess(fenHistory.at(-1));

    if (
      chessState.isDrawByFiftyMoves() ||
      chessState.isInsufficientMaterial() ||
      chessState.isStalemate()
    ) {
      const drawType: DrawType = chessState.isDrawByFiftyMoves()
        ? 'Draw by fifty moves'
        : chessState.isInsufficientMaterial()
          ? 'Draw by insufficient materials'
          : 'Draw by stalemate';

      await this.databaseService.match
        .update({
          where: { id: matchID },
          data: {
            gameState: { update: { fenHistory: fenHistory } },
            status: 'DRAW',
            endedAt: new Date(),
          },
        })
        .catch(() => {
          throw new MatchNotFoundException('Update failed, match not found');
        });

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
        drawType: drawType,
        matchID: matchID,
        reason: 'Draw',
        playerIDs: [playerWhiteID, playerBlackID],
      });

      await this.matchRepository.delete(matchID);

      return true;
    }

    return false;
  }

  private async checkIfThreefoldRepetitionOccuried(
    matchID: string,
    fenHistory: string[],
  ): Promise<void> {
    const wasThreefoldRepetition =
      this.wasThreefoldRepetitionOccuried(fenHistory);

    if (wasThreefoldRepetition) {
      await this.matchRepository.update(matchID, { drawAvailable: true });
    }
  }

  private wasThreefoldRepetitionOccuried(fenHistory: string[]): boolean {
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

  private checkIfPlayerInCheck(matchID: string, fenHistory: string[]): void {
    const chessState = new Chess(fenHistory.at(-1));

    if (chessState.isCheck()) {
      const kingPosition = chessState
        .findPiece({ type: 'k', color: chessState.turn() })
        .shift();

      const attackers = kingPosition ? chessState.attackers(kingPosition) : [];

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK, {
        matchID: matchID,
        attackers: attackers,
      });
    }
  }

  async requestDraw(matchID: string): Promise<void> {
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');
    if (!foundMatch.drawAvailable)
      throw new CannotRequestDrawException('Draw claim not available yet');

    const { fenHistory, playerBlackID, playerWhiteID } = foundMatch;

    this.databaseService.match
      .update({
        where: {
          id: matchID,
        },
        data: {
          gameState: {
            update: {
              fenHistory: fenHistory,
            },
          },
          status: 'DRAW',
          endedAt: new Date(),
        },
      })
      .catch(() => {
        throw new MatchNotFoundException('Update failed, match not found');
      });

    this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
      drawType: 'Draw by threefold repetition',
      matchID: matchID,
      reason: 'Draw',
      playerIDs: [playerWhiteID, playerBlackID],
    });

    await this.matchRepository.delete(matchID);
  }

  async requestSurrender(
    matchID: string,
    whoSurrenderedID: string,
  ): Promise<OngoingMatchData> {
    const foundMatch = await this.matchRepository.get(matchID);

    if (!foundMatch) throw new MatchNotFoundException('Match not found');

    const { fenHistory, playerWhiteID, playerBlackID } = foundMatch;

    const [winner, loser] =
      playerWhiteID === whoSurrenderedID
        ? [playerBlackID, playerWhiteID]
        : [playerWhiteID, playerBlackID];

    this.databaseService.match
      .update({
        where: {
          id: matchID,
        },
        data: {
          status: 'FINISHED',
          gameState: {
            update: {
              fenHistory: fenHistory,
            },
          },
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
      })
      .catch(() => {
        throw new MatchNotFoundException('Update failed, match not found');
      });

    this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
      matchID: matchID,
      reason: 'Surrendered',
      winnerID: winner,
      loserID: loser,
      playerIDs: [playerWhiteID, playerBlackID],
    });

    await this.matchRepository.delete(matchID);

    return foundMatch;
  }
}
