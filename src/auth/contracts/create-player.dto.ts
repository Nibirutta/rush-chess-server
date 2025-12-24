import {
  IsString,
  IsNotEmpty,
  IsStrongPassword,
  Length,
  MaxLength,
} from 'class-validator';

export class CreatePlayerDTO {
  @IsNotEmpty()
  @IsString()
  @Length(2, 20)
  nickname: string;

  @IsNotEmpty()
  @IsString()
  @Length(4, 20)
  username: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  @MaxLength(20)
  password: string;
}
