import { PartialType } from '@nestjs/swagger';
import { CreateAdviceDto } from './create-advice.dto';

/**
 * ✏️ UPDATE ADVICE DTO
 *
 * Validation pour mettre à jour un conseil.
 * Tous les champs sont optionnels.
 */
export class UpdateAdviceDto extends PartialType(CreateAdviceDto) {}
