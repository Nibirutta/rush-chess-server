export interface GameState {
  FENcode: string;
}

export interface GameData {
  gameState: GameState;
  playerAsWhite: string;
  playerAsBlack: string;
}
