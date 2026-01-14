import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: "Email de l'utilisateur",
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Token reçu par email', example: 'a1b2c3d4' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Nouveau mot de passe', example: 'NewPass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  password: string;

  @ApiProperty({
    description: 'Confirmer le mot de passe',
    example: 'NewPass123!',
  })
  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;
}
