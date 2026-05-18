/**
 * API contract Zod validation schemas barrel export
 * @module api/schemas
 */

// Auth schemas
export {
  loginRequestSchema,
  loginResponseSchema,
  sessionResponseSchema,
  userObjectSchema,
  jwtPayloadSchema,
} from "./auth.schema";

// Map schemas
export {
  mapQueryParamsSchema,
  requestMarkerSchema,
  technicianMarkerSchema,
  heatmapZoneSchema,
} from "./map.schema";

// Service request schemas
export {
  createRequestBodySchema,
  createRequestResponseSchema,
  clientRequestSchema,
} from "./requests.schema";

// Job schemas
export { availableJobSchema, completedJobSchema } from "./jobs.schema";

// Admin schemas
export {
  transactionSchema,
  transactionsResponseSchema,
  transactionSummarySchema,
  verificationSchema,
  verificationActionSchema,
  platformEventSchema,
  kpiResponseSchema,
  weeklyPerformanceSchema,
} from "./admin.schema";

// Technician schemas
export {
  availabilityRequestSchema,
  availabilityResponseSchema,
} from "./technician.schema";

// AI schemas
export { diagnosisResponseSchema } from "./ai.schema";

// Error schemas
export {
  errorResponseSchema,
  validationErrorResponseSchema,
} from "./errors.schema";

// WebSocket schemas
export {
  wsConnectionEstablishedSchema,
  wsPingSchema,
  wsPongSchema,
  wsSearchStartSchema,
  wsSearchAckSchema,
  wsSearchProgressSchema,
  wsSearchMatchSchema,
  wsSearchTimeoutSchema,
  wsTrackingUpdateSchema,
  wsTrackingArrivedSchema,
  wsMissionOfferSchema,
  wsMissionAcceptSchema,
  wsMissionRejectSchema,
  wsMissionConfirmedSchema,
  wsMissionExpiredSchema,
  wsClientToServerMessageSchema,
  wsServerToClientMessageSchema,
  wsServerToTechnicianMessageSchema,
  wsMessageSchema,
} from "./websocket.schema";
