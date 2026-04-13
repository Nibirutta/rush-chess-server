export interface GameState {
  fenHistory: string[];
  matchState: 'started' | 'waiting' | 'paused';
}

export interface PlayerInMatch {
  ID: string;
  connected: boolean;
}

export interface GameData {
  matchID: string;
  gameState: GameState;
  playerAsWhite: PlayerInMatch;
  playerAsBlack: PlayerInMatch;
}
