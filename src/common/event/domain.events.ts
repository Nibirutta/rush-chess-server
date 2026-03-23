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

export type DomainEventsMap = {
  [DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED]: OnInviteExpired;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED]: OnPlayerStatusChanged;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED]: OnMatchAccepted;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_EXPIRED]: OnMatchExpired;
};
