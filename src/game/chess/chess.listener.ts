import { Injectable } from '@nestjs/common';
import { ChessService } from './chess.service';
import { OnDomainEvents } from 'src/common/event/on-domain-events.decorator';
import { OnMatchAccepted } from 'src/common/event/domain.events';

Injectable();
export class ChessListener {
  constructor(private readonly chessService: ChessService) {}

  @OnDomainEvents('on_match_accepted')
  async onMatchAccepted(payload: OnMatchAccepted) {
    await this.chessService.createMatch(payload);
  }
}
