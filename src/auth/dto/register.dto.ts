import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CameroonCity, CameroonRegion } from './cameroon.enum';

export class RegisterDto {
  @ApiProperty({
    description: 'Adresse email de l’utilisateur',
    example: 'john.doe@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: 'Email requis' })
  email: string;

  @ApiProperty({
    description:
      'Mot de passe (min 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial)',
    example: 'Password123!',
    minLength: 8,
    maxLength: 100,
    format: 'password',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Mot de passe requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(100, {
    message: 'Le mot de passe ne peut pas dépasser 100 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
  })
  password: string;

  @ApiProperty({
    description: 'Confirmer le mot de passe',
    example: 'Password123!',
    minLength: 8,
    maxLength: 100,
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  passwordConfirmation: string;

  @ApiProperty({ description: "Prénom de l'utilisateur", example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'Nom de famille', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone',
    example: '+237651234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Ville de résidence',
    enum: CameroonCity,
  })
  @IsOptional()
  @IsEnum(CameroonCity, { message: 'Ville invalide' })
  city?: CameroonCity;

  @ApiPropertyOptional({
    description: 'Région de résidence',
    enum: CameroonRegion,
  })
  @IsOptional()
  @IsEnum(CameroonRegion, { message: 'Région invalide' })
  region?: CameroonRegion;

  @ApiPropertyOptional({ description: 'Device ID (pour tracker la session)' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'User Agent (navigateur ou app)' })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
