/**
 * Technician Service API contract types
 * @module api/types/technician
 */

/** PATCH /api/technician/availability - Request body */
export interface AvailabilityRequest {
  online: boolean;
  lat: number;
  lng: number;
}

/** PATCH /api/technician/availability - Response (200) */
export interface AvailabilityResponse {
  online: boolean;
  updated_at: string; // ISO-8601
}
