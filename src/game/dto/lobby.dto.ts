import { IsNotEmpty, IsString, IsBoolean } from 'class-validator';

export class IsPlayerReadyDTO {
  @IsNotEmpty()
  @IsString()
  playerID: string;

  @IsNotEmpty()
  @IsBoolean()
  ready: boolean;
}
