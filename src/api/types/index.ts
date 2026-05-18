/**
 * API contract type definitions barrel export
 * @module api/types
 */

// Auth types
export type {
  LoginRequest,
  LoginResponse,
  SessionResponse,
  UserObject,
  JWTPayload,
  UserRole,
} from "./auth";

// Map types
export type {
  RequestMarker,
  TechnicianMarker,
  HeatmapZone,
  MapQueryParams,
  RequestCategory,
  TechnicianStatus,
} from "./map";

// Service request types
export type {
  CreateRequestBody,
  CreateRequestResponse,
  ClientRequest,
  ServiceCategory,
  RequestLocation,
  ClientRequestStatus,
} from "./requests";

// Job types
export type { AvailableJob, CompletedJob } from "./jobs";

// Admin types
export type {
  Transaction,
  TransactionsResponse,
  TransactionSummary,
  Verification,
  VerificationAction,
  PlatformEvent,
  PlatformEventType,
  KPIResponse,
  KPIMetric,
  WeeklyPerformance,
  WeekDay,
  TransactionStatus,
} from "./admin";

// Technician types
export type { AvailabilityRequest, AvailabilityResponse } from "./technician";

// AI types
export type { DiagnosisResponse } from "./ai";

// Error types
export type {
  ErrorResponse,
  ValidationErrorResponse,
  ValidationError,
  ErrorCode,
} from "./errors";

// WebSocket types
export type {
  WSConnectionEstablished,
  WSPing,
  WSPong,
  WSSearchStart,
  WSSearchAck,
  WSSearchProgress,
  WSSearchMatch,
  WSSearchTimeout,
  WSTrackingUpdate,
  WSTrackingArrived,
  WSMissionOffer,
  WSMissionAccept,
  WSMissionReject,
  WSMissionConfirmed,
  WSMissionExpired,
  WSClientToServerMessage,
  WSServerToClientMessage,
  WSServerToTechnicianMessage,
  WSMessage,
} from "./websocket";
