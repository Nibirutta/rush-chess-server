export interface GameState {
  fenHistory: string[];
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
