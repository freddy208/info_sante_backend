import { ApiPropertyOptional } from '@nestjs/swagger';

export class FiltersDto {
  @ApiPropertyOptional({ type: [String], description: 'Liste des villes' })
  cities?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Liste des régions' })
  regions?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Liste des catégories' })
  categories?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Liste des organisations',
  })
  organizations?: string[];
}
