export interface DecodedAccessToken {
  id: string;
  nickname: string;
  iat: number;
  exp: number;
}

export interface DecodedSessionToken {
  id: string;
  iat: number;
  exp: number;
}

export interface DecodedResetToken {
  id: string;
  iat: number;
  exp: number;
}
