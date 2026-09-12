import { Inject, Injectable } from '@nestjs/common';
import {
  DOMAIN_EVENTS_PATTERN,
  DomainEventEmitterService,
  REDIS_CLIENT,
  RedisRepository,
  OngoingMatchData,
} from '@app/common';
import { RedisClientType } from 'redis';

@Injectable()
export class MatchRepository extends RedisRepository<OngoingMatchData> {
  constructor(
    @Inject(REDIS_CLIENT) protected readonly redisClient: RedisClientType,
    private readonly domainEventEmitter: DomainEventEmitterService,
  ) {
    super('match', redisClient);
  }

  async update(
    id: string,
    data: Partial<OngoingMatchData>,
  ): Promise<OngoingMatchData | undefined> {
    const updatedMatch = await super.update(id, data);

    if (updatedMatch) {
      this.domainEventEmitter.emit(
        DOMAIN_EVENTS_PATTERN.ON_MATCH_UPDATE,
        updatedMatch,
      );
    }

    return updatedMatch;
  }
}
