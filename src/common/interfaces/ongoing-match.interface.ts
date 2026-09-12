export interface OngoingMatchData {
  matchID: string;
  matchState: 'started' | 'waiting';
  turn: 'w' | 'b';
  fenHistory: string[];
  playerWhiteID: string;
  isWhiteConnected: boolean;
  playerBlackID: string;
  isBlackConnected: boolean;
  spectators?: string[];
  drawAvailable: boolean;
}
