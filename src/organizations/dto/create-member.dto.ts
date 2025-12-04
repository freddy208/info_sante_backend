// src/organizations/dto/create-member.dto.ts

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 👤 CREATE MEMBER DTO
 *
 * Validation pour ajouter un membre à une organisation.
 */
export class CreateMemberDto {
  @ApiProperty({
    description: 'Prénom',
    example: 'Jean',
  })
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @ApiProperty({
    description: 'Nom',
    example: 'Mbarga',
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @ApiProperty({
    description: 'Email',
    example: 'jean.mbarga@laquintinie.cm',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiPropertyOptional({
    description: 'Téléphone (format international)',
    example: '+237699999999',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+237[0-9]{9}$/, {
    message: 'Le téléphone doit être au format camerounais (+237XXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({
    description: 'Poste/Fonction',
    example: 'Directeur Médical',
  })
  @IsString()
  @IsOptional()
  position?: string;
}
