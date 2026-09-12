import { PlayerStatus } from '../enums/player-status.enum';
import { OngoingMatchData as OnMatchUpdate } from '../interfaces/ongoing-match.interface';
import { DrawType } from '../types/draw.types';
import { DOMAIN_EVENTS_PATTERN } from './domain-events.pattern';
import { Square } from 'chess.js';

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
  matchID: string;
  attackers: Square[];
}

export type DomainEventsMap = {
  [DOMAIN_EVENTS_PATTERN.ON_INVITE_EXPIRED]: OnInviteExpired;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_STATUS_CHANGED]: OnPlayerStatusChanged;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_ACCEPTED]: OnMatchAccepted;
  [DOMAIN_EVENTS_PATTERN.ON_MATCH_UPDATE]: OnMatchUpdate;
  [DOMAIN_EVENTS_PATTERN.ON_FINISHED_MATCH]: OnFinishedMatch;
  [DOMAIN_EVENTS_PATTERN.ON_PLAYER_IN_CHECK]: OnPlayerInCheck;
};
