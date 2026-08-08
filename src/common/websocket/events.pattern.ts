export const GENERAL_EVENTS = {
  EXCEPTION: 'notify_exception',
} as const;

export const CHESS_EVENTS = {
  INVALID_MATCH: 'notify_invalid_match',
  FINISHED_MATCH: 'notify_finished_match',
  LOAD_MATCH: 'notify_load_match',
  MATCH_COUNTDOWN: 'notify_match_countdown',
  START_MATCH: 'notify_start_match',
  NEW_MATCH_STATE: 'notify_new_match_state',
  AVAILABLE_MOVES: 'notify_available_moves',
  PLAYER_IN_CHECK: 'notify_player_in_check',
  OPPONENT_DISCONNECTION: 'notify_opponent_disconnection',
  DRAW_CLAIM_AVAILABLE: 'notify_draw_claim_avaliable',
  SURRENDER: 'notify_surrender',
  CAN_NOT_LEAVE_FROM_ONGOING_MATCH: 'notify_can_not_leave_from_ongoing_match',
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
