import { IsNotEmpty, IsBoolean } from 'class-validator';

export class IsPlayerReadyDTO {
  @IsNotEmpty()
  @IsBoolean()
  ready: boolean;
}
