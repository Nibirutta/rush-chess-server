import { PlayerStatus } from '../enums/player-status.enum';
import { DrawType } from '../types/draw.types';
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

export interface OnMatchTerminated {
  matchID: string;
  playersInMatch: string[];
}

export interface OnPlayerInCheck {
  playerID: string;
}

export interface OnThreefoldRepetition {
  matchID: string;
}

export interface OnDraw {
  matchID: string;
  drawType: DrawType;
}

export interface OnCheckmate {
  matchID: string;
  winnerID: string;
  loserID: string;
}

export interface OnMatchStartOrRestart {
  matchID: string;
}

export interface OnOpponentDisconnection {
  matchID: string;
  disconnectedPlayer: string;
}

export type DomainEventsMap = {
  [DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED]: OnInviteExpired;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED]: OnPlayerStatusChanged;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED]: OnMatchAccepted;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED]: OnMatchTerminated;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_ABANDONED]: OnMatchTerminated;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK]: OnPlayerInCheck;
  [DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION]: OnThreefoldRepetition;
  [DOMAIN_EVENTS_PATTERN.ON_DRAW]: OnDraw;
  [DOMAIN_EVENTS_PATTERN.ON_CHECKMATE]: OnCheckmate;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_START]: OnMatchStartOrRestart;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_RESTART]: OnMatchStartOrRestart;
  [DOMAIN_EVENTS_PATTERN.ON_OPPONENT_DISCONNECTION]: OnOpponentDisconnection;
};
