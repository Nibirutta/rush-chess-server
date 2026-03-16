import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InviteResponseDTO {
  @IsNotEmpty()
  @IsUUID()
  waitRoomID: string;

  @IsNotEmpty()
  @IsBoolean()
  accepted: boolean;
}

export class SendInviteDTO {
  @IsNotEmpty()
  @IsString()
  opponentID: string;
}
