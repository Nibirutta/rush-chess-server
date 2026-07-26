export interface DecodedAccessToken {
  playerID: string;
  playerNickname: string;
  iat: number;
  exp: number;
}

export interface DecodedSessionToken {
  playerID: string;
  iat: number;
  exp: number;
}

export interface DecodedResetToken {
  playerID: string;
  iat: number;
  exp: number;
}
