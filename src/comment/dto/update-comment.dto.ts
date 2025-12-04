import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCommentDto } from './create-comment.dto';

/**
 * ✏️ UPDATE COMMENT DTO
 *
 * Validation pour mettre à jour un commentaire.
 * Tous les champs sont optionnels sauf contentType et contentId.
 */
export class UpdateCommentDto extends PartialType(
  OmitType(CreateCommentDto, [
    'contentType',
    'contentId',
    'parentCommentId',
  ] as const),
) {}
