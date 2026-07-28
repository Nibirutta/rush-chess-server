export const DOMAIN_EVENTS_PATTERN = {
  ON_INVITE_EXPIRED: 'on_invite_expired',
  ON_PLAYER_STATUS_CHANGED: 'on_player_status_changed',
  ON_MATCH_ACCEPTED: 'on_match_accepted',
  ON_FINISHED_MATCH: 'on_finished_match',
  ON_PLAYER_IN_CHECK: 'on_player_in_check',
  ON_THREEFOLD_REPETITION: 'on_threefold_repetition',
  ON_MATCH_START: 'on_match_start',
  ON_OPPONENT_DISCONNECTION: 'on_opponent_disconnection',
} as const;
