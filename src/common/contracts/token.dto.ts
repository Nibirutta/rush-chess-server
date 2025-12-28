import { IsNotEmpty, IsString } from 'class-validator';

export class BaseTokenPayloadDto {
  @IsNotEmpty()
  id: string;
}

export class AccessTokenPayloadDto extends BaseTokenPayloadDto {
  @IsNotEmpty()
  @IsString()
  nickname: string;
}

export class SessionTokenPayloadDto extends BaseTokenPayloadDto {}

export class ResetTokenPayloadDto extends BaseTokenPayloadDto {}
