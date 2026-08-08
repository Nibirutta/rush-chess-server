export const GENERAL_MESSAGES = {
  TESTING: 'testing',
} as const;

export const LOBBY_MESSAGES = {
  SEND_MESSAGE: 'send_message',
  SEND_INVITE: 'send_invite',
  INVITE_RESPONSE: 'invite_response',
  IS_PLAYER_READY: 'is_player_ready',
} as const;

export const CHESS_MESSAGES = {
  JOIN_MATCH: 'join_match',
  GET_AVAILABLE_MOVES: 'get_available_moves',
  MAKE_MOVE: 'make_move',
  REQUEST_DRAW: 'request_draw',
  REQUEST_SURRENDER: 'request_surrender',
  LEAVE_MATCH: 'leave_match',
} as const;
