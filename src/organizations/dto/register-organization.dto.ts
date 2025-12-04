// src/organizations/dto/register-organization.dto.ts

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  Matches,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { Type } from 'class-transformer';

/**
 * 📝 REGISTER ORGANIZATION DTO
 *
 * Validation pour l'inscription d'une organisation.
 */
export class RegisterOrganizationDto {
  @ApiProperty({
    description: "Nom de l'organisation",
    example: 'Hôpital Laquintinie',
    minLength: 3,
    maxLength: 200,
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom est requis' })
  @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
  @MaxLength(200, { message: 'Le nom ne peut pas dépasser 200 caractères' })
  name: string;

  @ApiProperty({
    description: "Email de l'organisation",
    example: 'contact@laquintinie.cm',
  })
  @IsEmail({}, { message: 'Email invalide' })
  @IsNotEmpty({ message: "L'email est requis" })
  email: string;

  @ApiProperty({
    description:
      'Mot de passe (min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre)',
    example: 'SecurePass123!',
    minLength: 8,
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre',
  })
  password: string;

  @ApiProperty({
    description: "Type d'organisation",
    enum: OrganizationType,
    example: OrganizationType.HOSPITAL_PUBLIC,
  })
  @IsEnum(OrganizationType, { message: "Type d'organisation invalide" })
  type: OrganizationType;

  @ApiProperty({
    description: 'Téléphone (format international)',
    example: '+237699999999',
  })
  @IsString({ message: 'Le téléphone doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le téléphone est requis' })
  @Matches(/^\+237[0-9]{9}$/, {
    message: 'Le téléphone doit être au format camerounais (+237XXXXXXXXX)',
  })
  phone: string;

  @ApiPropertyOptional({
    description: 'WhatsApp (format international)',
    example: '+237699999999',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\+237[0-9]{9}$/, {
    message: 'Le WhatsApp doit être au format camerounais (+237XXXXXXXXX)',
  })
  whatsapp?: string;

  @ApiPropertyOptional({
    description: "Description de l'organisation",
    example: 'Hôpital public de référence à Douala',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000, {
    message: 'La description ne peut pas dépasser 2000 caractères',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'Site web',
    example: 'https://laquintinie.cm',
  })
  @IsUrl({}, { message: 'URL du site web invalide' })
  @IsOptional()
  website?: string;

  @ApiProperty({
    description: 'Adresse complète',
    example: 'Rue de la République, Deido',
  })
  @IsString({ message: "L'adresse doit être une chaîne de caractères" })
  @IsNotEmpty({ message: "L'adresse est requise" })
  address: string;

  @ApiProperty({
    description: 'Ville',
    example: 'Douala',
  })
  @IsString({ message: 'La ville doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La ville est requise' })
  city: string;

  @ApiProperty({
    description: 'Région',
    example: 'Littoral',
  })
  @IsString({ message: 'La région doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'La région est requise' })
  region: string;

  @ApiPropertyOptional({
    description: 'Latitude',
    example: 4.0511,
    minimum: -90,
    maximum: 90,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'La latitude doit être un nombre' })
  @Min(-90, { message: 'La latitude doit être >= -90' })
  @Max(90, { message: 'La latitude doit être <= 90' })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude',
    example: 9.7679,
    minimum: -180,
    maximum: 180,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'La longitude doit être un nombre' })
  @Min(-180, { message: 'La longitude doit être >= -180' })
  @Max(180, { message: 'La longitude doit être <= 180' })
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    description: "Numéro d'enregistrement (RC, agrément ministère)",
    example: 'RC/DLA/2023/B/1234',
  })
  @IsString({
    message: "Le numéro d'enregistrement doit être une chaîne de caractères",
  })
  @IsNotEmpty({ message: "Le numéro d'enregistrement est requis" })
  registrationNumber: string;

  @ApiPropertyOptional({
    description: "URL du document d'agrément (PDF)",
  })
  @IsString()
  @IsOptional()
  licenseDocument?: string;

  @ApiPropertyOptional({
    description: 'Urgences disponibles 24h/24 ?',
    example: true,
  })
  @IsBoolean({ message: 'emergencyAvailable doit être un booléen' })
  @IsOptional()
  emergencyAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Liste des assurances acceptées',
    example: ['CNPS', 'ALLIANZ', 'AXA'],
    type: [String],
  })
  @IsArray({ message: 'insuranceAccepted doit être un tableau' })
  @IsString({ each: true, message: 'Chaque assurance doit être une chaîne' })
  @IsOptional()
  insuranceAccepted?: string[];

  @ApiPropertyOptional({
    description: "Heures d'ouverture (format JSON)",
    example: {
      lundi: '08:00-17:00',
      mardi: '08:00-17:00',
      mercredi: '08:00-17:00',
      jeudi: '08:00-17:00',
      vendredi: '08:00-17:00',
      samedi: '08:00-12:00',
      dimanche: 'Fermé',
    },
  })
  @IsOptional()
  openingHours?: any;
}
