import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class SendMessageDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  content: string;
}