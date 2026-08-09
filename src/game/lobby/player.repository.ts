import { REDIS_CLIENT, RedisRepository } from '@app/common';
import { OnlinePlayerData } from '../interfaces/player.interface';
import { Inject, Injectable } from '@nestjs/common';
import { RedisClientType } from 'redis';

@Injectable()
export class PlayerRepository extends RedisRepository<OnlinePlayerData> {
  constructor(
    @Inject(REDIS_CLIENT) protected readonly redisClient: RedisClientType,
  ) {
    super('player', redisClient);
  }
}
