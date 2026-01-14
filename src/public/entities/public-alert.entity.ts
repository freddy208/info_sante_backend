export enum PublicAlertLevel {
  CRITICAL = 'critical',
  WARNING = 'warning',
}

export enum PublicAlertType {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  ARTICLE = 'ARTICLE',
}

export class PublicAlertEntity {
  id: string;
  title: string;

  /**
   * Extrait court, max ~160 caractères
   * (le service garantit la taille)
   */
  excerpt: string;

  level: PublicAlertLevel;

  location: string;

  /**
   * ISO 8601 (ex: 2026-01-10T08:45:00Z)
   */
  date: string;

  type: PublicAlertType;

  /**
   * Slug optionnel mais normalisé
   */
  slug?: string;

  constructor(partial: Partial<PublicAlertEntity>) {
    Object.assign(this, partial);
  }
}
