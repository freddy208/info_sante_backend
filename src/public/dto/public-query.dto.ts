import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NearbyQueryDto {
  @ApiPropertyOptional({ description: 'Latitude utilisateur', example: 3.848 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @Type(() => Number)
  lat!: number;

  @ApiPropertyOptional({
    description: 'Longitude utilisateur',
    example: 11.5021,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @Type(() => Number)
  lng!: number;

  @ApiPropertyOptional({ description: 'Rayon de recherche en km', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  radius?: number;

  // ==========================================
  // FIX 1 : Ajout explicite de la propriété 'limit'
  // Cela corrige l'erreur "'limit' n'existe pas dans le type"
  // ==========================================
  @ApiPropertyOptional({
    description: 'Limite stricte de résultats',
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(50)
  @Type(() => Number)
  limit?: number = 50;

  // ==========================================
  // FIX 2 : Correction du type 'types'
  // On retire @Type(() => [String]) pour éviter l'erreur StringConstructor[].
  // Les types string[] sont gérés automatiquement par NestJS pour les Query Params
  // grace à @IsArray() et @IsString({ each: true }).
  // ==========================================
  @ApiPropertyOptional({
    description: 'Filtrer par type (ex: ?types=HOSPITAL_PUBLIC&types=CLINIC)',
    type: [String],
    example: ['HOSPITAL_PUBLIC', 'CLINIC'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  // On ne met pas @Type ici, le compilateur déduit string[] du type de la classe
  types?: string[];
}

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Terme de recherche (ex: Paludisme)',
  })
  @IsString()
  q!: string;

  @ApiPropertyOptional({ description: 'Limite de résultats', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}
