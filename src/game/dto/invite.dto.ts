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

// Do not require validation

export class OnInviteExpired {
  waitRoomID: string;

  constructor(waitRoomID: string) {
    this.waitRoomID = waitRoomID;
  }
}

export class InviteTicket {
  waitRoomID: string;
  opponentSocketID: string;

  constructor(waitRoomID: string, opponentSocketID: string) {
    this.waitRoomID = waitRoomID;
    this.opponentSocketID = opponentSocketID;
  }
}
