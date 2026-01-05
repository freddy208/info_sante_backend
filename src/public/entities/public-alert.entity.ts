/* eslint-disable @typescript-eslint/no-unused-vars */
import { Priority } from '@prisma/client';

export class PublicAlertEntity {
  id: string;
  title: string;
  excerpt: string;
  level: 'critical' | 'warning';
  location: string;
  date: string;
  type: 'ANNOUNCEMENT' | 'ARTICLE';
  // On accepte undefined ici, le service nettoiera le null
  slug?: string;

  constructor(partial: Partial<PublicAlertEntity>) {
    Object.assign(this, partial);
  }
}
