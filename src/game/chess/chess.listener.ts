import { Injectable } from '@nestjs/common';
import { ChessService } from './chess.service';
import {
  OnDomainEvents,
  OnMatchAccepted,
  DOMAIN_EVENTS_PATTERN,
} from '@app/common';

@Injectable()
export class ChessListener {
  constructor(private readonly chessService: ChessService) {}

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED)
  async onMatchAccepted(payload: OnMatchAccepted) {
    await this.chessService.prepareMatch(payload);
  }
}
