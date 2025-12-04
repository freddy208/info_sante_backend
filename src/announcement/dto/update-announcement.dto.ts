import { PartialType } from '@nestjs/swagger';
import { CreateAnnouncementDto } from './create-announcement.dto';

/**
 * ✏️ UPDATE ANNOUNCEMENT DTO
 *
 * Validation pour mettre à jour une annonce.
 * Tous les champs sont optionnels.
 */
export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}
