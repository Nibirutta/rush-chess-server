import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChessConfigService {
  constructor(private readonly configService: ConfigService) {}

  getPort(): number {
    return this.configService.getOrThrow<number>('PORT');
  }

  getDatabaseURL(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  getRedisURL(): string {
    const redisURL = this.configService.get<string | null>('REDIS_URL');

    if (redisURL) {
      return redisURL;
    }

    const altRedisURL = `redis://${this.getRedisHost()}:${this.getRedisPort()}`;

    return altRedisURL;
  }

  getRedisHost(): string {
    return this.configService.getOrThrow<string>('REDIS_HOST');
  }

  getRedisPort(): number {
    return this.configService.getOrThrow<number>('REDIS_PORT');
  }

  getAccessTokenSecret(): string {
    return this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET');
  }

  getSessionTokenSecret(): string {
    return this.configService.getOrThrow<string>('SESSION_TOKEN_SECRET');
  }

  getResetTokenSecret(): string {
    return this.configService.getOrThrow<string>('RESET_TOKEN_SECRET');
  }

  getOrigins(): string {
    return this.configService.getOrThrow<string>('ORIGINS');
  }
}
