export const GENERAL_EVENTS = {
  EXCEPTION: 'notify_exception',
} as const;

export const MATCH_EVENTS = {
  INVALID_MATCH: 'notify_invalid_match',
  FINISHED_MATCH: 'notify_finished_match',
  LOAD_MATCH: 'notify_load_match',
  MATCH_UPDATE: 'notify_match_update',
  AVAILABLE_MOVES: 'notify_available_moves',
  PLAYER_IN_CHECK: 'notify_player_in_check',
  OPPONENT_DISCONNECTION: 'notify_opponent_disconnection',
} as const;

export const LOBBY_EVENTS = {
  ONLINE_PLAYERS: 'notify_online_players',
  PLAYER_UPDATE: 'notify_player_update',
  MESSAGE: 'notify_message',
  TYPING: 'notify_typing',
  INVITE: 'notify_invite',
  INVITE_ACCEPTED: 'notify_invite_accepted',
  INVITE_NOT_ACCEPTED: 'notify_invite_not_accepted',
  INVITE_EXPIRED: 'notify_invite_expired',
} as const;
