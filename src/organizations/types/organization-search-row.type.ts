// src/organizations/types/organization-search-row.type.ts
export type OrganizationSearchRow = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  region: string | null;
  logo: string | null;
  description: string | null;
  rating: number | null;
  totalReviews: number;
  emergencyAvailable: boolean;
  rank: number | null;
};
