import { IsUUID } from "class-validator";

export class RevokeApiTokenDto {
  @IsUUID()
  apiTokenId!: string;
}
