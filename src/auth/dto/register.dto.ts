/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/auth/dto/register.dto.ts

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

/**
 * 📝 REGISTER DTO
 *
 * Validation des données d'inscription.
 */

// ✅ ENUM pour les régions du Cameroun
export enum CameroonRegion {
  ADAMAOUA = 'Adamaoua',
  CENTRE = 'Centre',
  EST = 'Est',
  EXTREME_NORD = 'Extrême-Nord',
  LITTORAL = 'Littoral',
  NORD = 'Nord',
  NORD_OUEST = 'Nord-Ouest',
  OUEST = 'Ouest',
  SUD = 'Sud',
  SUD_OUEST = 'Sud-Ouest',
}

// ✅ Principales villes du Cameroun (optionnel, ou validation libre)
export enum CameroonCity {
  // =====================================
  // RÉGION ADAMAOUA
  // =====================================
  NGAOUNDERE = 'Ngaoundéré',
  MEIGANGA = 'Meiganga',
  TIBATI = 'Tibati',
  TIGNERE = 'Tignère',
  BANYO = 'Banyo',

  // =====================================
  // RÉGION CENTRE
  // =====================================
  YAOUNDE = 'Yaoundé',
  MBALMAYO = 'Mbalmayo',
  OBALA = 'Obala',
  MFOU = 'Mfou',
  AKONOLINGA = 'Akonolinga',
  BAFIA = 'Bafia',
  ESEKA = 'Eséka',
  MBANDJOCK = 'Mbandjock',
  NANGA_EBOKO = 'Nanga-Eboko',
  NTUI = 'Ntui',
  MONATELE = 'Monatélé',
  SOA = 'Soa',
  AYOS = 'Ayos',

  // =====================================
  // RÉGION EST
  // =====================================
  BERTOUA = 'Bertoua',
  ABONG_MBANG = 'Abong-Mbang',
  BATOURI = 'Batouri',
  YOKADOUMA = 'Yokadouma',
  LOMIE = 'Lomié',
  BETARE_OYA = 'Bétaré-Oya',
  GAROUA_BOULAI = 'Garoua-Boulaï',

  // =====================================
  // RÉGION EXTRÊME-NORD
  // =====================================
  MAROUA = 'Maroua',
  KOUSSERI = 'Kousséri',
  MOKOLO = 'Mokolo',
  MORA = 'Mora',
  YAGOUA = 'Yagoua',
  KAELE = 'Kaélé',
  GUIDIGUIS = 'Guidiguis',
  MINDIF = 'Mindif',

  // =====================================
  // RÉGION LITTORAL
  // =====================================
  DOUALA = 'Douala',
  EDEA = 'Edéa',
  NKONGSAMBA = 'Nkongsamba',
  LOUM = 'Loum',
  MBANGA = 'Mbanga',
  MANJO = 'Manjo',
  PENJA = 'Penja',
  DIZANGUE = 'Dizangué',
  YABASSI = 'Yabassi',
  NDOM = 'Ndom',

  // =====================================
  // RÉGION NORD
  // =====================================
  GAROUA = 'Garoua',
  GUIDER = 'Guider',
  TCHOLLIRE = 'Tcholliré',
  LAGDO = 'Lagdo',
  POLI = 'Poli',
  REY_BOUBA = 'Rey-Bouba',
  PITOA = 'Pitoa',

  // =====================================
  // RÉGION NORD-OUEST
  // =====================================
  BAMENDA = 'Bamenda',
  KUMBO = 'Kumbo',
  NDOP = 'Ndop',
  MBENGWI = 'Mbengwi',
  WUM = 'Wum',
  FUNDONG = 'Fundong',
  NKAMBE = 'Nkambe',
  BAFUT = 'Bafut',

  // =====================================
  // RÉGION OUEST
  // =====================================
  BAFOUSSAM = 'Bafoussam',
  DSCHANG = 'Dschang',
  MBOUDA = 'Mbouda',
  FOUMBAN = 'Foumban',
  BAFANG = 'Bafang',
  BANDJOUN = 'Bandjoun',
  BANGANGTE = 'Bangangté',
  BAHAM = 'Baham',
  FOUMBOT = 'Foumbot',
  TONGA = 'Tonga',

  // =====================================
  // RÉGION SUD
  // =====================================
  EBOLOWA = 'Ebolowa',
  KRIBI = 'Kribi',
  SANGMELIMA = 'Sangmélima',
  AMBAM = 'Ambam',
  CAMPO = 'Campo',
  LOLODORF = 'Lolodorf',
  AKOM_II = 'Akom II',
  BIPINDI = 'Bipindi',

  // =====================================
  // RÉGION SUD-OUEST
  // =====================================
  BUEA = 'Buea',
  LIMBE = 'Limbé',
  KUMBA = 'Kumba',
  TIKO = 'Tiko',
  MUYUKA = 'Muyuka',
  MAMFE = 'Mamfé',
  IDENAU = 'Idenau',
  MUNDEMBA = 'Mundemba',
}

export class RegisterDto {
  @ApiProperty({
    // eslint-disable-next-line prettier/prettier
    description: 'Adresse email de l\'utilisateur',
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
    description: "Prénom de l'utilisateur",
    example: 'John',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Prénom requis' })
  @MinLength(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le prénom ne peut pas dépasser 100 caractères' })
  firstName: string;

  @ApiPropertyOptional({
    description: "Nom de famille de l'utilisateur",
    example: 'Doe',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsOptional()
  @MinLength(2, { message: 'Le nom doit contenir au moins 2 caractères' })
  @MaxLength(100, { message: 'Le nom ne peut pas dépasser 100 caractères' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Numéro de téléphone',
    example: '+237 6 XX XX XX XX',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  // =====================================
  // ✅ NOUVEAUX CHAMPS : VILLE ET RÉGION
  // =====================================

  @ApiPropertyOptional({
    description: 'Ville de résidence au Cameroun',
    enum: CameroonCity,
    example: CameroonCity.DOUALA,
  })
  @IsEnum(CameroonCity, { message: 'Ville invalide' })
  @IsOptional()
  city?: CameroonCity;

  @ApiPropertyOptional({
    description: 'Région de résidence au Cameroun',
    enum: CameroonRegion,
    example: CameroonRegion.LITTORAL,
  })
  @IsEnum(CameroonRegion, { message: 'Région invalide' })
  @IsOptional()
  region?: CameroonRegion;
}
