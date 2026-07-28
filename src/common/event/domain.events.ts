import { PlayerStatus } from '../enums/player-status.enum';
import { DrawType } from '../types/draw.types';
import { DOMAIN_EVENTS_PATTERN } from './domain-events.pattern';

export interface OnPlayerStatusChanged {
  playerID: string;
  status: PlayerStatus;
}

export interface OnInviteExpired {
  inviteID: string;
  challengerID: string;
  opponentID: string;
}

export interface OnMatchAccepted {
  matchID: string;
  challengerID: string;
  opponentID: string;
}

export interface OnFinishedMatch {
  matchID: string;
  reason: 'Abandoned' | 'Expired' | 'Draw' | 'Checkmate' | 'Surrendered';
  playerIDs: string[];
  drawType?: DrawType;
  winnerID?: string;
  loserID?: string;
}

export interface OnPlayerInCheck {
  playerID: string;
}

export interface OnThreefoldRepetition {
  matchID: string;
}

export interface OnMatchStart {
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
  [DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH]: OnFinishedMatch;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK]: OnPlayerInCheck;
  [DOMAIN_EVENTS_PATTERN.ON_THREEFOLD_REPETITION]: OnThreefoldRepetition;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_START]: OnMatchStart;
  [DOMAIN_EVENTS_PATTERN.ON_OPPONENT_DISCONNECTION]: OnOpponentDisconnection;
};
