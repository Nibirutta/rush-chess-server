export const INCOMING_MESSAGES = {
  TESTING: 'testing',
  SEND_MESSAGE: 'send_message',
  IS_PLAYER_TYPING: 'is_player_typing',
  SEND_INVITATION: 'send_invitation',
  RESPONSE_TO_INVITE: 'response_to_invite',
  IS_READY: 'is_ready',
  JOIN_MATCH: 'join_match',
  MAKE_MOVE: 'make_move',
} as const;

export const OUTGOING_MESSAGES = {
  NOTIFY_ONLINE_PLAYERS: 'notify_online_players',
  NOTIFY_MESSAGE: 'notify_message',
  NOTIFY_TYPING: 'notify_typing',
  NOTIFY_INVITE: 'notify_invite',
  NOTIFY_INVITE_ACCEPTED: 'notify_invite_accepted',
  NOTIFY_INVITE_NOT_ACCEPTED: 'notify_invite_not_accepted',
  NOTIFY_INVITE_EXPIRED: 'notify_invite_expired',
  NOTIFY_PLAYER_UPDATE: 'notify_player_update',
  NOTIFY_MATCH_EXPIRED: 'notify_match_expired',
  NOTIFY_INVALID_MATCH: 'notify_invalid_match',
  NOTIFY_MATCH_COUNTDOWN: 'notify_match_countdown',
  NOTIFY_START_MATCH: 'notify_start_match',
  NOTIFY_NEW_MATCH_STATE: 'notify_new_match_state',
} as const;
