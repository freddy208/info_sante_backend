import { OrganizationType } from '@prisma/client';

export class PublicOrganizationEntity {
  id: string;
  name: string;
  type: OrganizationType;

  /**
   * Téléphone public normalisé (ex: +2376xxxxxxx)
   */
  phone?: string;

  address: string;
  city: string;
  region: string;

  /**
   * Coordonnées TOUJOURS en number
   */
  latitude: number;
  longitude: number;

  /**
   * Distance en kilomètres (si calculée)
   */
  distance?: number;

  constructor(partial: Partial<PublicOrganizationEntity>) {
    if (partial.latitude !== undefined) {
      partial.latitude = Number(partial.latitude);
    }

    if (partial.longitude !== undefined) {
      partial.longitude = Number(partial.longitude);
    }

    if (partial.distance !== undefined) {
      partial.distance = Math.max(0, Number(partial.distance.toFixed(2)));
    }

    Object.assign(this, {
      address: '',
      city: '',
      region: '',
      ...partial,
    });
  }
}
