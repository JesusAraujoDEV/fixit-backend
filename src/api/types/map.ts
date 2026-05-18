/**
 * Map Service API contract types
 * @module api/types/map
 */

/** Service request category labels (Spanish) for map markers */
export type RequestCategory =
  | "Electricidad"
  | "Plomería"
  | "Climatización"
  | "General"
  | "Cerrajería";

/** Technician status on the map */
export type TechnicianStatus = "available" | "en_route" | "busy";

/** GET /api/map/requests - Response item */
export interface RequestMarker {
  id: string;
  position: [number, number]; // [latitude, longitude]
  label: string;
  type: "request";
  category: RequestCategory;
}

/** GET /api/map/technicians - Response item */
export interface TechnicianMarker {
  id: string;
  position: [number, number]; // [latitude, longitude]
  label: string; // "Name - Specialty"
  type: "technician";
  status: TechnicianStatus;
}

/** GET /api/map/heatmap - Response item */
export interface HeatmapZone {
  id: string;
  center: [number, number]; // [latitude, longitude]
  radius_m: number;
  intensity: number; // 0.0 - 1.0
  label: string;
}

/** Query parameters for all map endpoints */
export interface MapQueryParams {
  lat: number;
  lng: number;
  radius_km: number;
  all?: "true"; // Admin-only for technicians endpoint
}
