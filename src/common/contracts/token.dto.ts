export class BaseTokenPayloadDto {
  playerID: string;
}

export class AccessTokenPayloadDto extends BaseTokenPayloadDto {
  playerNickname: string;
}

export class SessionTokenPayloadDto extends BaseTokenPayloadDto {}

export class ResetTokenPayloadDto extends BaseTokenPayloadDto {}
