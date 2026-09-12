import { Module } from '@nestjs/common';
import { MatchGateway } from './match.gateway';
import { MatchService } from './match.service';
import { MatchListener } from './match.listener';
import { MatchRepository } from './match.repository';
import { BullModule } from '@nestjs/bullmq';
import { MATCH_QUEUES } from '../queues/game-queues.constants';
import { MatchProcessor } from './match.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: MATCH_QUEUES,
    }),
  ],
  controllers: [],
  providers: [
    MatchGateway,
    MatchService,
    MatchListener,
    MatchRepository,
    MatchProcessor,
  ],
  exports: [],
})
export class MatchModule {}
