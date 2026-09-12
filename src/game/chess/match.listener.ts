import { Injectable } from '@nestjs/common';
import { MatchService } from './match.service';
import {
  OnDomainEvents,
  OnMatchAccepted,
  DOMAIN_EVENTS_PATTERN,
} from '@app/common';

@Injectable()
export class MatchListener {
  constructor(private readonly chessService: MatchService) {}

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED)
  async onMatchAccepted(payload: OnMatchAccepted): Promise<void> {
    const { matchID, challengerID, opponentID } = payload;

    await this.chessService.prepareMatch(matchID, challengerID, opponentID);
  }
}
