// src/organizations/dto/update-member.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateMemberDto } from './create-member.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ✏️ UPDATE MEMBER DTO
 *
 * Validation pour mettre à jour un membre.
 */
export class UpdateMemberDto extends PartialType(CreateMemberDto) {
  @ApiPropertyOptional({
    description: 'Membre actif ?',
    example: true,
  })
  @IsBoolean({ message: 'isActive doit être un booléen' })
  @IsOptional()
  isActive?: boolean;
}
