/**
 * Service Request API contract types
 * @module api/types/requests
 */

/** Valid service categories for request creation */
export type ServiceCategory =
  | "electrical"
  | "plumbing"
  | "hvac"
  | "general"
  | "locksmith"
  | "cleaning";

/** Location object for service requests */
export interface RequestLocation {
  lat: number;
  lng: number;
  address: string;
}

/** POST /api/requests - Request body */
export interface CreateRequestBody {
  title: string; // 5-200 chars
  category: ServiceCategory;
  description: string; // 0-2000 chars
  location: RequestLocation;
  images: string[]; // max 4 URLs
}

/** POST /api/requests - Response (201) */
export interface CreateRequestResponse {
  id: string;
  title: string;
  category: string;
  description: string;
  location: RequestLocation;
  images: string[];
  status: "pending";
  created_at: string; // ISO-8601
  nearby_technicians_count: number;
  estimated_response_min: number;
}

/** Client request status */
export type ClientRequestStatus = "active" | "completed" | "cancelled";

/** GET /api/requests/mine - Response item */
export interface ClientRequest {
  id: string;
  title: string;
  category: string;
  status: ClientRequestStatus;
  technician: { name: string } | null;
  created_at: string; // ISO-8601
  price: string | null;
  eta_minutes?: number | null; // only when status is "active"
}
