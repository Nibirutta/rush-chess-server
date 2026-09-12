import { IsNotEmpty, IsBoolean } from 'class-validator';

export class SetPlayerStatusDTO {
  @IsNotEmpty()
  @IsBoolean()
  ready: boolean;
}
