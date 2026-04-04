import { PlayerStatus } from '../enums/player-status.enum';
import { DOMAIN_EVENTS_PATTERN } from './domain-events.pattern';

export interface OnPlayerStatusChanged {
  playerID: string;
  status: PlayerStatus;
}

export interface OnInviteExpired {
  waitRoomID: string;
}

export interface OnMatchAccepted {
  matchID: string;
  challengerID: string;
  opponentID: string;
}

export interface OnMatchExpired {
  matchID: string;
}

export interface OnPlayerInCheck {
  playerID: string;
}

export interface OnThreefoldRepetition {
  matchID: string;
}

export interface OnDraw {
  matchID: string;
  drawType:
    | 'Draw by threefold repetition'
    | 'Draw by fifty moves'
    | 'Draw by insufficient materials'
    | 'Draw by stalemate';
}

export interface OnCheckmate {
  matchID: string;
  winnerID: string;
  loserID: string;
}

export type DomainEventsMap = {
  [DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED]: OnInviteExpired;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED]: OnPlayerStatusChanged;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED]: OnMatchAccepted;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED]: OnMatchExpired;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK]: OnPlayerInCheck;
  [DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION]: OnThreefoldRepetition;
  [DOMAIN_EVENTS_PATTERN.ON_DRAW]: OnDraw;
  [DOMAIN_EVENTS_PATTERN.ON_CHECKMATE]: OnCheckmate;
};
