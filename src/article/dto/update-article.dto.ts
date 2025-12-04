import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto } from './create-article.dto';

/**
 * ✏️ UPDATE ARTICLE DTO
 *
 * Validation pour mettre à jour un article.
 * Tous les champs sont optionnels.
 */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
