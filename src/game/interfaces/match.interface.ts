export interface GameState {
  fenHistory: string[];
}

export interface GameData {
  matchID: string;
  gameState: GameState;
  playerAsWhite: string;
  playerAsBlack: string;
}
