export interface GameState {
  FEN: string;
}

export interface GameData {
  matchID: string;
  gameState: GameState;
  playerAsWhite: string;
  playerAsBlack: string;
}
