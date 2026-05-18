/**
 * Admin Service API Zod validation schemas
 * @module api/schemas/admin
 */

import { z } from "zod";
import type {
  TransactionsResponse,
  TransactionSummary,
  Verification,
  VerificationAction,
  PlatformEvent,
  KPIResponse,
  WeeklyPerformance,
} from "../types/admin";

/** Transaction status enum */
const transactionStatusEnum = z.enum(["completed", "in_progress", "disputed"]);

/** Platform event type enum */
const platformEventTypeEnum = z.enum(["info", "success", "warning", "error"]);

/** Schema for a single transaction object */
export const transactionSchema = z.object({
  id: z.string(),
  client: z.string(),
  technician: z.string(),
  service: z.string(),
  amount: z.string(),
  commission: z.string(),
  status: transactionStatusEnum,
  created_at: z.string().datetime(),
});

/** Schema for GET /api/admin/transactions response */
export const transactionsResponseSchema = z.object({
  data: z.array(transactionSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  per_page: z.number().int().min(1).max(100),
}) satisfies z.ZodType<TransactionsResponse>;

/** Schema for GET /api/admin/transactions/summary response */
export const transactionSummarySchema = z.object({
  today_count: z.number().int().min(0),
  today_volume: z.string(),
  today_commission: z.string(),
  disputes_pending: z.number().int().min(0),
}) satisfies z.ZodType<TransactionSummary>;

/** Schema for GET /api/admin/verifications response item */
export const verificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  experience: z.string(),
  documents_count: z.number().int().min(0),
  submitted_at: z.string().datetime(),
}) satisfies z.ZodType<Verification>;

/** Schema for PATCH /api/admin/verifications/:id request body */
export const verificationActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    reason: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().min(1),
  }),
]) satisfies z.ZodType<VerificationAction>;

/** Schema for GET /api/admin/events response item */
export const platformEventSchema = z.object({
  id: z.string(),
  time: z.string().datetime(),
  type: platformEventTypeEnum,
  message: z.string(),
}) satisfies z.ZodType<PlatformEvent>;

/** KPI metric schema */
const kpiMetricSchema = z.object({
  value: z.union([z.number(), z.string()]),
  delta: z.string(),
});

/** Schema for GET /api/admin/kpis response */
export const kpiResponseSchema = z.object({
  active_services: kpiMetricSchema,
  technicians_online: kpiMetricSchema,
  revenue_today: kpiMetricSchema,
  reports_pending: kpiMetricSchema,
}) satisfies z.ZodType<KPIResponse>;

/** Week day schema */
const weekDaySchema = z.object({
  label: z.string(),
  completed: z.number().int().min(0),
  date: z.string(),
});

/** Schema for GET /api/admin/performance/weekly response */
export const weeklyPerformanceSchema = z.object({
  days: z.array(weekDaySchema).length(7),
}) satisfies z.ZodType<WeeklyPerformance>;
