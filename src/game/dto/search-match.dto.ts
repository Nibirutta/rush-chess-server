import { IsNotEmpty, IsString } from 'class-validator';

export class SearchMatchDTO {
  @IsNotEmpty()
  @IsString()
  matchID: string;
}
