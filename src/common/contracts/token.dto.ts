export class BaseTokenPayloadDto {
  id: string;
}

export class AccessTokenPayloadDto extends BaseTokenPayloadDto {
  nickname: string;
}

export class SessionTokenPayloadDto extends BaseTokenPayloadDto {}

export class ResetTokenPayloadDto extends BaseTokenPayloadDto {}
