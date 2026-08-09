import { Processor, WorkerHost } from '@nestjs/bullmq';
import { LOBBY_QUEUES } from '../queues/game-queues.constants';
import { Job } from 'bullmq';
import { InviteSession } from '../interfaces/invite.interface';
import { LobbyService } from './lobby.service';
import {
  DOMAIN_EVENTS_PATTERN,
  DomainEventEmitterService,
  PlayerStatus,
} from '@app/common';

@Processor(LOBBY_QUEUES)
export class LobbyProcessor extends WorkerHost {
  constructor(
    private readonly lobbyService: LobbyService,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {
    super();
  }

  async process(job: Job<InviteSession>) {
    if (job.name === 'expire-invite') {
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
