/**
 * Jobs API contract types (Technician)
 * @module api/types/jobs
 */

/** GET /api/jobs/available - Response item */
export interface AvailableJob {
  id: string;
  category: string;
  title: string;
  distance_km: number; // one decimal
  expires_in_min: number;
  payout: string; // "$min–max"
  urgent: boolean;
}

/** GET /api/jobs/completed - Response item */
export interface CompletedJob {
  id: string;
  title: string;
  earnings: string; // "$amount"
  rating: number; // 1-5
  completed_at: string; // ISO-8601
}
