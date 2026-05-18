# Implementation Plan: Backend API Contracts

## Overview

Implement the backend API contracts for the FixIt on-demand technician marketplace. This plan covers TypeScript type definitions, Zod validation schemas, API client functions (REST + WebSocket), error handling utilities, and property-based tests to ensure contract conformance. The implementation targets the TanStack Start frontend with React 19, using TanStack Query for data fetching and a WebSocket client for real-time channels.

## Tasks

- [x] 1. Set up project structure and shared types
  - [x] 1.1 Create API contract type definitions and shared interfaces
    - Create `src/api/types/auth.ts` with LoginRequest, LoginResponse, SessionResponse, UserObject, JWTPayload interfaces
    - Create `src/api/types/map.ts` with RequestMarker, TechnicianMarker, HeatmapZone, MapQueryParams interfaces
    - Create `src/api/types/requests.ts` with CreateRequestBody, CreateRequestResponse, ClientRequest interfaces
    - Create `src/api/types/jobs.ts` with AvailableJob, CompletedJob interfaces
    - Create `src/api/types/admin.ts` with Transaction, TransactionsResponse, TransactionSummary, Verification, VerificationAction, PlatformEvent, KPIResponse, KPIMetric, WeeklyPerformance, WeekDay interfaces
    - Create `src/api/types/technician.ts` with AvailabilityRequest, AvailabilityResponse interfaces
    - Create `src/api/types/ai.ts` with DiagnosisResponse interface
    - Create `src/api/types/errors.ts` with ErrorResponse, ValidationErrorResponse, ValidationError, ErrorCode types
    - Create `src/api/types/websocket.ts` with all WebSocket message interfaces (connection, search, tracking, mission, heartbeat)
    - Create `src/api/types/index.ts` barrel export file
    - _Requirements: 1.1, 1.3, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 9.2, 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 16.1, 16.2, 17.1, 18.1_

  - [x] 1.2 Create Zod validation schemas for all API contracts
    - Create `src/api/schemas/auth.schema.ts` with loginRequestSchema, loginResponseSchema, sessionResponseSchema, userObjectSchema
    - Create `src/api/schemas/map.schema.ts` with mapQueryParamsSchema, requestMarkerSchema, technicianMarkerSchema, heatmapZoneSchema
    - Create `src/api/schemas/requests.schema.ts` with createRequestBodySchema (title 5-200 chars, valid category, description 0-2000 chars, location validation, images max 4), createRequestResponseSchema, clientRequestSchema
    - Create `src/api/schemas/jobs.schema.ts` with availableJobSchema, completedJobSchema
    - Create `src/api/schemas/admin.schema.ts` with transactionsResponseSchema, transactionSummarySchema, verificationSchema, verificationActionSchema, platformEventSchema, kpiResponseSchema, weeklyPerformanceSchema
    - Create `src/api/schemas/technician.schema.ts` with availabilityRequestSchema, availabilityResponseSchema
    - Create `src/api/schemas/ai.schema.ts` with diagnosisResponseSchema
    - Create `src/api/schemas/errors.schema.ts` with errorResponseSchema, validationErrorResponseSchema
    - Create `src/api/schemas/websocket.schema.ts` with schemas for all WebSocket message types
    - Create `src/api/schemas/index.ts` barrel export file
    - _Requirements: 1.1, 1.2, 3.3, 6.2, 6.3, 7.1, 9.1, 10.4, 11.1, 14.1, 15.1, 16.2, 17.1, 17.3_

- [ ] 2. Implement error handling and API client infrastructure
  - [-] 2.1 Create error handling utilities and HTTP client wrapper
    - Create `src/api/client/http-client.ts` with a typed fetch wrapper that handles JWT Bearer token injection, response parsing, and error mapping
    - Implement error classification: map HTTP 400 to `invalid_params`, 401 to `unauthorized`/`token_expired`/`token_invalid`, 403 to `forbidden`, 404 to `not_found`, 422 to validation errors or `invalid_file`
    - Create `src/api/client/errors.ts` with custom error classes: ApiError, AuthenticationError, AuthorizationError, ValidationError, NotFoundError
    - Implement response validation using Zod schemas (parse response bodies against expected schemas)
    - _Requirements: 1.2, 1.4, 2.1, 2.2, 2.3, 2.4, 3.3, 6.2, 10.4_

  - [x] 2.2 Create API base configuration and constants
    - Create `src/api/client/config.ts` with base URL configuration, default headers, timeout settings
    - Define endpoint path constants for all REST endpoints
    - Define WebSocket path constants (`/ws/client`, `/ws/technician`, `/ws/admin`)
    - _Requirements: 1.1, 18.1_

- [ ] 3. Implement Auth Service API client
  - [~] 3.1 Implement authentication API functions
    - Create `src/api/services/auth.service.ts` with `login(credentials: LoginRequest): Promise<LoginResponse>` function
    - Implement `getSession(): Promise<SessionResponse>` function for GET /api/auth/me
    - Validate responses against Zod schemas before returning
    - Handle 401 errors with appropriate error codes
    - _Requirements: 1.1, 1.2, 1.5_

  - [~] 3.2 Write property tests for auth service contracts
    - **Property 1: Login response round-trip consistency** — For any authenticated user, the user object from login SHALL be identical to the user object from GET /api/auth/me
    - **Property 2: JWT payload completeness** — For any issued JWT, decoding SHALL produce sub, role, iat, and exp with exp > iat
    - **Property 3: Invalid token rejection** — For any malformed/expired JWT, the API SHALL return 401 with appropriate error code
    - **Validates: Requirements 1.1, 1.3, 1.4, 1.5**

- [ ] 4. Implement Map Service API client
  - [~] 4.1 Implement map data API functions
    - Create `src/api/services/map.service.ts` with `getRequestMarkers(params: MapQueryParams): Promise<RequestMarker[]>` function
    - Implement `getTechnicianMarkers(params: MapQueryParams): Promise<TechnicianMarker[]>` function
    - Implement `getHeatmapZones(params: MapQueryParams): Promise<HeatmapZone[]>` function
    - Validate query parameters before sending (lat, lng, radius_km must be numeric)
    - Validate responses against Zod schemas
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 5.1, 5.2_

  - [~] 4.2 Write property tests for map service contracts
    - **Property 6: Geospatial radius filtering for request markers** — Every returned marker position SHALL be within radius_km of the query point and contain required fields
    - **Property 7: Invalid map query parameter rejection** — Missing or non-numeric lat/lng/radius_km SHALL return HTTP 400
    - **Property 8: Geospatial and status filtering for technician markers** — Non-Admin results SHALL only include available/en_route technicians within radius
    - **Property 9: Heatmap zone schema and intensity bounds** — Every zone SHALL have intensity in [0.0, 1.0] and valid structure
    - **Validates: Requirements 3.1, 3.2, 3.3, 4.1, 4.2, 5.1**

- [ ] 5. Implement Request Service API client
  - [~] 5.1 Implement service request and job API functions
    - Create `src/api/services/requests.service.ts` with `createRequest(body: CreateRequestBody): Promise<CreateRequestResponse>` function
    - Implement `getMyRequests(status?: "active" | "completed" | "cancelled"): Promise<ClientRequest[]>` function
    - Create `src/api/services/jobs.service.ts` with `getAvailableJobs(params: { lat: number; lng: number; category?: string }): Promise<AvailableJob[]>` function
    - Implement `getCompletedJobs(params?: { date_from?: string; date_to?: string }): Promise<CompletedJob[]>` function
    - Validate request bodies against Zod schemas before sending
    - Validate responses against Zod schemas
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3_

  - [~] 5.2 Write property tests for request and job contracts
    - **Property 10: Service request creation with valid input** — Valid CreateRequestBody SHALL return 201 with id, status="pending", created_at, nearby_technicians_count, estimated_response_min
    - **Property 11: Service request validation error structure** — Invalid body SHALL return 422 with non-empty errors array containing field and message
    - **Property 12: Job feed sorting and distance invariants** — All jobs SHALL have distance_km ≤ 10, urgent first, then ascending distance
    - **Property 13: Available job schema completeness** — Every job SHALL contain id, category, title, distance_km, expires_in_min, payout, urgent
    - **Property 14: Client request history ordering and conditional fields** — Results SHALL be sorted by created_at descending, active requests SHALL include eta_minutes
    - **Validates: Requirements 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.2, 8.3**

- [~] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Admin Service API client
  - [~] 7.1 Implement admin transactions and verifications API functions
    - Create `src/api/services/admin.service.ts` with `getTransactions(params?: { page?: number; per_page?: number; status?: string; date_from?: string; date_to?: string }): Promise<TransactionsResponse>` function
    - Implement `getTransactionSummary(): Promise<TransactionSummary>` function
    - Implement `getVerifications(status?: "pending" | "approved" | "rejected"): Promise<Verification[]>` function
    - Implement `updateVerification(id: string, action: VerificationAction): Promise<Verification>` function
    - Implement `getEvents(params?: { limit?: number; type?: string }): Promise<PlatformEvent[]>` function
    - Implement `getKPIs(): Promise<KPIResponse>` function
    - Implement `getWeeklyPerformance(): Promise<WeeklyPerformance>` function
    - Validate responses against Zod schemas
    - _Requirements: 9.1, 9.2, 9.3, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 16.1, 16.2, 16.3_

  - [~] 7.2 Write property tests for admin service contracts
    - **Property 15: Admin transactions pagination invariant** — Response SHALL contain data (length ≤ per_page), total, page, per_page, and valid transaction objects
    - **Property 16: Admin event log ordering and schema** — Events SHALL be sorted by time descending with valid type and structure
    - **Property 22: KPI response structure with deltas** — Response SHALL contain active_services, technicians_online, revenue_today, reports_pending each with value and delta
    - **Property 23: Weekly performance returns exactly 7 days** — Days array SHALL contain exactly 7 elements with label, completed, and date
    - **Validates: Requirements 9.1, 9.2, 11.1, 11.2, 16.1, 16.2**

- [ ] 8. Implement Technician and AI Service API clients
  - [~] 8.1 Implement technician availability API function
    - Create `src/api/services/technician.service.ts` with `updateAvailability(body: AvailabilityRequest): Promise<AvailabilityResponse>` function
    - Validate request body and response against Zod schemas
    - _Requirements: 15.1, 15.2, 15.3_

  - [~] 8.2 Implement AI diagnosis API function
    - Create `src/api/services/ai.service.ts` with `diagnoseImage(file: File): Promise<DiagnosisResponse>` function
    - Implement multipart/form-data upload handling
    - Validate file size (max 5MB) and format (PNG/JPG) before sending
    - Validate response against Zod schema
    - _Requirements: 17.1, 17.2, 17.3_

  - [~] 8.3 Write property tests for technician and AI contracts
    - **Property 21: Availability toggle response schema** — Valid request SHALL return 200 with online (matching request) and updated_at (ISO-8601)
    - **Property 24: AI diagnosis response schema and bounds** — Valid image SHALL return diagnosis, confidence in [0.0, 1.0], valid suggested_category, and tags array
    - **Property 25: Invalid file upload rejection** — File > 5MB or non-PNG/JPG SHALL return 422 with error code "invalid_file"
    - **Validates: Requirements 15.1, 17.1, 17.3**

- [ ] 9. Implement WebSocket client and real-time message handling
  - [~] 9.1 Create WebSocket connection manager
    - Create `src/api/realtime/ws-client.ts` with WebSocket connection class supporting JWT authentication via query parameter
    - Implement connection lifecycle: connect, disconnect, reconnect with exponential backoff (1s, 2s, 4s, max 30s)
    - Implement heartbeat handling: respond to `ping` with `pong`, detect heartbeat timeout
    - Implement `last_event_id` parameter for missed event delivery on reconnect
    - Implement message parsing and validation against WebSocket Zod schemas
    - Support role-scoped paths: `/ws/client`, `/ws/technician`, `/ws/admin`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [~] 9.2 Implement client-side WebSocket message handlers
    - Create `src/api/realtime/client-channel.ts` with radar search flow: send `search:start`, handle `search:ack`, `search:progress`, `search:match`, `search:timeout`
    - Create `src/api/realtime/technician-channel.ts` with mission flow: handle `mission:offer`, send `mission:accept`/`mission:reject`, handle `mission:confirmed`/`mission:expired`
    - Create `src/api/realtime/admin-channel.ts` with event stream handling for real-time admin events
    - Implement tracking message handling: `tracking:update`, `tracking:arrived`
    - Type-safe message dispatch using discriminated unions
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 14.1, 14.2, 14.3, 14.4, 11.3_

  - [~] 9.3 Write property tests for WebSocket contracts
    - **Property 17: WebSocket search:start produces search:ack** — Valid search:start message SHALL produce search:ack with non-empty search_id
    - **Property 19: Mission offer schema completeness** — Every mission:offer SHALL contain mission_id, title, category, urgent, payout, distance_km, expires_in_seconds=30, client_location
    - **Property 26: WebSocket authentication enforcement** — Invalid JWT SHALL result in close code 4001; valid JWT SHALL produce connection:established with session_id
    - **Validates: Requirements 12.1, 14.1, 18.1, 18.2**

- [ ] 10. Implement role-based access control utilities
  - [~] 10.1 Create RBAC middleware and route guards
    - Create `src/api/guards/role-guard.ts` with role validation utility that checks JWT role claim against endpoint requirements
    - Define role-to-endpoint mapping: Client endpoints, Technician endpoints, Admin endpoints
    - Implement `requireRole(allowedRoles: string[])` guard function for use in API client layer
    - Handle 403 Forbidden responses with appropriate error mapping
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [~] 10.2 Write property tests for RBAC enforcement
    - **Property 4: Role-based access enforcement** — User with role R accessing endpoint restricted to role S (R ≠ S) SHALL receive 403
    - **Property 5: Unauthenticated request rejection** — Request without Authorization header on protected endpoint SHALL receive 401
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [ ] 11. Integrate TanStack Query hooks for all API services
  - [~] 11.1 Create TanStack Query hooks for auth and map services
    - Create `src/api/hooks/useAuth.ts` with `useLogin` mutation and `useSession` query hooks
    - Create `src/api/hooks/useMap.ts` with `useRequestMarkers`, `useTechnicianMarkers`, `useHeatmapZones` query hooks
    - Configure appropriate staleTime, cacheTime, and refetchInterval for map data
    - _Requirements: 1.1, 1.5, 3.1, 4.1, 5.1_

  - [~] 11.2 Create TanStack Query hooks for request, job, and admin services
    - Create `src/api/hooks/useRequests.ts` with `useCreateRequest` mutation and `useMyRequests` query hooks
    - Create `src/api/hooks/useJobs.ts` with `useAvailableJobs` and `useCompletedJobs` query hooks
    - Create `src/api/hooks/useAdmin.ts` with `useTransactions`, `useTransactionSummary`, `useVerifications`, `useUpdateVerification`, `useEvents`, `useKPIs`, `useWeeklyPerformance` hooks
    - Create `src/api/hooks/useTechnician.ts` with `useUpdateAvailability` mutation hook
    - Create `src/api/hooks/useAI.ts` with `useDiagnoseImage` mutation hook
    - _Requirements: 6.1, 7.1, 7.4, 8.1, 9.1, 9.3, 10.1, 10.2, 11.1, 15.1, 16.1, 16.2, 17.1_

  - [~] 11.3 Create WebSocket integration hooks
    - Create `src/api/hooks/useWebSocket.ts` with connection management hook supporting auto-connect/disconnect on mount/unmount
    - Create `src/api/hooks/useRadarSearch.ts` with hook for initiating and tracking radar search flow
    - Create `src/api/hooks/useTracking.ts` with hook for receiving technician location updates
    - Create `src/api/hooks/useMissionAlerts.ts` with hook for receiving and responding to mission offers
    - Create `src/api/hooks/useAdminEvents.ts` with hook for real-time admin event stream
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 13.1, 13.2, 14.1, 14.2, 14.3, 11.3_

- [~] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Wire all modules together with barrel exports and integration verification
  - [~] 13.1 Create barrel exports and API module entry point
    - Create `src/api/index.ts` exporting all types, schemas, services, hooks, guards, and realtime modules
    - Ensure all imports resolve correctly and no circular dependencies exist
    - Verify TypeScript compilation passes with strict mode
    - _Requirements: 1.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 15.1, 16.1, 17.1, 18.1_

  - [~] 13.2 Write integration tests for end-to-end API flows
    - Test complete auth flow: login → get session → use token for protected endpoint
    - Test request creation flow: create request → verify in my requests list
    - Test WebSocket connection flow: connect → receive established → heartbeat exchange
    - Test role-based access: attempt cross-role access → verify 403 response
    - _Requirements: 1.1, 1.5, 2.1, 6.1, 8.1, 18.1, 18.3_

- [~] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All code uses TypeScript with strict mode as defined in the design document
- Zod schemas serve dual purpose: runtime validation and type inference
- TanStack Query hooks provide caching, deduplication, and background refetching
- WebSocket client implements reconnection with exponential backoff per design spec

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1", "7.1", "8.1", "8.2", "10.1"] },
    { "id": 4, "tasks": ["3.2", "4.2", "5.2", "7.2", "8.3", "10.2"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2", "9.3"] },
    { "id": 7, "tasks": ["11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3"] },
    { "id": 9, "tasks": ["13.1"] },
    { "id": 10, "tasks": ["13.2"] }
  ]
}
```
