import {
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AcceptInvitationDto {
  @IsUUID()
  tenantId!: string;

  @IsString()
  @Length(43, 43)
  token!: string;

  @IsString()
  @MaxLength(120)
  @MinLength(1)
  @Matches(/\S/)
  displayName!: string;

  @IsString()
  @MaxLength(128)
  @MinLength(12)
  password!: string;
}
