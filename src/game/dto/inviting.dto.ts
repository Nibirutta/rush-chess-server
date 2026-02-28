import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InviteResponseDTO {
  @IsNotEmpty()
  @IsUUID()
  matchID: string;

  @IsNotEmpty()
  @IsBoolean()
  accepted: boolean;
}

export class SendInviteDTO {
  @IsNotEmpty()
  @IsString()
  nickname: string;
}
