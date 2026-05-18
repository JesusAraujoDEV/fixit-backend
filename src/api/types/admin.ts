/**
 * Admin Service API contract types
 * @module api/types/admin
 */

/** Transaction status */
export type TransactionStatus = "completed" | "in_progress" | "disputed";

/** GET /api/admin/transactions - Response */
export interface TransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  per_page: number;
}

/** Transaction object */
export interface Transaction {
  id: string;
  client: string;
  technician: string;
  service: string;
  amount: string; // "$X.XX"
  commission: string; // "$X.XX"
  status: TransactionStatus;
  created_at: string; // ISO-8601
}

/** GET /api/admin/transactions/summary - Response */
export interface TransactionSummary {
  today_count: number;
  today_volume: string; // "$X,XXX"
  today_commission: string; // "$XX.XX"
  disputes_pending: number;
}

/** GET /api/admin/verifications - Response item */
export interface Verification {
  id: string;
  name: string;
  specialty: string;
  experience: string;
  documents_count: number;
  submitted_at: string; // ISO-8601
}

/** PATCH /api/admin/verifications/:id - Request body */
export interface VerificationAction {
  action: "approve" | "reject";
  reason?: string; // required when action is "reject"
}

/** Platform event type */
export type PlatformEventType = "info" | "success" | "warning" | "error";

/** GET /api/admin/events - Response item */
export interface PlatformEvent {
  id: string;
  time: string; // ISO-8601
  type: PlatformEventType;
  message: string;
}

/** GET /api/admin/kpis - Response */
export interface KPIResponse {
  active_services: KPIMetric;
  technicians_online: KPIMetric;
  revenue_today: KPIMetric;
  reports_pending: KPIMetric;
}

/** KPI metric with value and delta */
export interface KPIMetric {
  value: number | string;
  delta: string; // "+12%" or "-3"
}

/** GET /api/admin/performance/weekly - Response */
export interface WeeklyPerformance {
  days: WeekDay[];
}

/** Weekly performance day entry */
export interface WeekDay {
  label: string; // day name
  completed: number;
  date: string; // ISO-8601 date
}
