import { IsString, MinLength } from 'class-validator';

export class SessionRefreshDto {
  @IsString()
  @MinLength(20)
  sessionValue!: string;
}
