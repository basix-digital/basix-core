import { IsString, MinLength } from "class-validator";

export class RotateEnvironmentVariableDto {
  @IsString()
  @MinLength(1)
  value!: string;
}
