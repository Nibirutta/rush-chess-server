import { Injectable } from '@nestjs/common';
import { ChessService } from './chess.service';
import { OnDomainEvents } from 'src/common/event/on-domain-events.decorator';
import { OnMatchAccepted } from 'src/common/event/domain.events';
import { DOMAIN_EVENTS_PATTERN } from 'src/common/event/domain-events.pattern';

@Injectable()
export class ChessListener {
  constructor(private readonly chessService: ChessService) {}

  @OnDomainEvents(DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED)
  async onMatchAccepted(payload: OnMatchAccepted) {
    await this.chessService.createMatch(payload);
  }
}
