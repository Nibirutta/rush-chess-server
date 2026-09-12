import { Processor, WorkerHost } from '@nestjs/bullmq';
import {
  INVITE_EXPIRE_JOB,
  INVITE_QUEUES,
} from '../queues/game-queues.constants';
import { Job } from 'bullmq';
import { InviteExpirationJob } from '../queues/invite.jobs';
import { LobbyService } from './lobby.service';
import {
  DOMAIN_EVENTS_PATTERN,
  DomainEventEmitterService,
  PlayerStatus,
} from '@app/common';

@Processor(INVITE_QUEUES)
export class InviteProcessor extends WorkerHost {
  constructor(
    private readonly lobbyService: LobbyService,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {
    super();
  }

  async process(job: Job<InviteExpirationJob>) {
    if (job.name === INVITE_EXPIRE_JOB) {
      const { inviteID, challengerID, opponentID } = job.data;

      await this.lobbyService.changePlayerStatus(
        challengerID,
        PlayerStatus.Ready,
      );
      await this.lobbyService.changePlayerStatus(
        opponentID,
        PlayerStatus.Ready,
      );

      this.domainEventEmitter.emit(DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED, {
        inviteID,
        challengerID,
        opponentID,
      });
    }

    return Promise.resolve();
  }
}
