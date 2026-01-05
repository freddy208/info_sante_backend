import { PartialType } from '@nestjs/swagger';
import { CreateNotificationDto } from './create-notification.dto';

/**
 * ✏️ UPDATE NOTIFICATION DTO
 *
 * Validation pour mettre à jour une notification.
 * Tous les champs sont optionnels.
 */
export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {}
