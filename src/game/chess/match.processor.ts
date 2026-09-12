import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  MATCH_ABANDONED_JOB,
  MATCH_QUEUES,
  MATCH_EXPIRE_JOB,
} from '../queues/game-queues.constants';
import { Job } from 'bullmq';
import { MatchJob } from '../queues/match.jobs';
import {
  DatabaseService,
  DOMAIN_EVENTS_PATTERN,
  DomainEventEmitterService,
  MatchNotFoundException,
} from '@app/common';
import { MatchRepository } from './match.repository';

@Processor(MATCH_QUEUES)
export class MatchProcessor extends WorkerHost {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly domainEventEmitter: DomainEventEmitterService,
    private readonly matchRepository: MatchRepository,
  ) {
    super();
  }

  async process(job: Job<MatchJob>): Promise<any> {
    const { matchID, playerAsWhiteID, playerAsBlackID, fenHistory } = job.data;

    switch (job.name) {
      case MATCH_EXPIRE_JOB:
        await this.databaseService.match
          .delete({ where: { id: matchID } })
          .catch(() => {
            throw new MatchNotFoundException(
              'Failed on delete, match not found',
            );
          });
        await this.matchRepository.delete(matchID);

        this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
          matchID,
          playerIDs: [playerAsWhiteID, playerAsBlackID],
          reason: 'Expired',
        });

        break;
      case MATCH_ABANDONED_JOB:
        await this.databaseService.match
          .update({
            where: { id: matchID },
            data: {
              gameState: {
                update: {
                  fenHistory: fenHistory,
                },
              },
              endedAt: new Date(),
              status: 'ABANDONED',
            },
          })
          .catch(() => {
            throw new MatchNotFoundException('Update failed, match not found');
          });
        await this.matchRepository.delete(matchID);

        this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH, {
          matchID,
          playerIDs: [playerAsWhiteID, playerAsBlackID],
          reason: 'Abandoned',
        });

        break;
      default:
        break;
    }

    return Promise.resolve();
  }
}
