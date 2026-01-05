import { OrganizationType } from '@prisma/client';

export class PublicOrganizationEntity {
  id: string;
  name: string;
  type: OrganizationType;
  phone: string;
  address: string;
  city: string;
  region: string;
  latitude: number; // FORCEMENT number pour la carte
  longitude: number; // FORCEMENT number
  distance?: number;

  constructor(partial: Partial<PublicOrganizationEntity>) {
    // Conversion explicite lors de l'instanciation si nécessaire
    if (partial.latitude) partial.latitude = Number(partial.latitude);
    if (partial.longitude) partial.longitude = Number(partial.longitude);
    Object.assign(this, partial);
  }
}
