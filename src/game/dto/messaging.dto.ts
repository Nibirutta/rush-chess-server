import { IsNotEmpty, IsBoolean, MaxLength, IsString } from 'class-validator';

export class IsTypingDTO {
  @IsNotEmpty()
  @IsBoolean()
  isTyping: boolean;
}

export class SendMessageDTO {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  content: string;
}
