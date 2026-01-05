// src/modules/announcement/dto/register-visitor.dto.ts

import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterVisitorDto {
  @ApiProperty({
    description: "ID de l'annonce",
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  announcementId: string;

  @ApiProperty({
    description: 'Nom complet du visiteur',
    example: 'Jean Dupont',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  visitorName: string;

  @ApiProperty({
    description: 'Email du visiteur',
    example: 'jean.dupont@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  visitorEmail: string;

  @ApiProperty({
    description: 'Téléphone du visiteur',
    example: '+237699999999',
  })
  @IsString()
  @IsNotEmpty()
  visitorPhone: string;

  // ✅ AJOUT : ID de l'appareil généré par le frontend
  @ApiProperty({
    description: "UUID de l'appareil pour garantir l'unicité",
    example: 'e8b3b2c0-d9e4-11ee-a1b5-02b2c4a1b3c4',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  deviceId: string;

  @ApiPropertyOptional({
    description: 'Notes additionnelles',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  notes?: string;
}
