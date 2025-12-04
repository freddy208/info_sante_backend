// src/location/interfaces/opencage-response.interface.ts

/**
 * 📍 OPENCAGE API RESPONSE INTERFACE
 *
 * Structure de la réponse retournée par l'API OpenCage Geocoding.
 *
 * Documentation : https://opencagedata.com/api
 */

export interface OpenCageGeometry {
  lat: number;
  lng: number;
}

export interface OpenCageComponents {
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  region?: string;
  state_district?: string;
  _type?: string;
}

export interface OpenCageResult {
  components: OpenCageComponents;
  formatted: string;
  geometry: OpenCageGeometry;
  bounds?: {
    northeast: OpenCageGeometry;
    southwest: OpenCageGeometry;
  };
  confidence: number; // 0-10 (10 = très précis)
  annotations?: {
    timezone?: {
      name: string;
      offset_string: string;
    };
    currency?: {
      name: string;
      symbol: string;
      iso_code: string;
    };
  };
}

export interface OpenCageResponse {
  results: OpenCageResult[];
  status: {
    code: number;
    message: string;
  };
  total_results: number;
  rate: {
    limit: number;
    remaining: number;
    reset: number;
  };
}
