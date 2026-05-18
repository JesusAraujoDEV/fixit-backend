# Requirements Document

## Introduction

This document specifies the backend API contracts (Data Requirements List) for the FixIt on-demand technician marketplace. The FixIt frontend is built with TanStack Start (SSR), React 19, and React-Leaflet, supporting three user roles: Client, Technician, and Admin. The backend must provide REST endpoints and real-time channels (WebSocket/SSE) that serve the exact data structures the frontend consumes. This specification enables a backend team to implement all required endpoints without ambiguity.

## Glossary

- **API_Gateway**: The backend HTTP server that exposes REST endpoints and WebSocket connections for the FixIt platform
- **Auth_Service**: The authentication subsystem responsible for credential validation, JWT issuance, and session management
- **Map_Service**: The subsystem that provides geolocation data for technicians, service requests, and heatmap zones
- **Request_Service**: The subsystem that handles service request creation, lifecycle management, and job feed delivery
- **Realtime_Service**: The subsystem that manages WebSocket/SSE connections for live updates including radar search, technician tracking, and mission alerts
- **Client**: A user role representing someone who requests on-demand technician services
- **Technician**: A user role representing a service professional who accepts and completes jobs
- **Admin**: A user role representing a platform operator with access to the NOC dashboard, transactions, and verifications
- **JWT**: JSON Web Token used for stateless authentication containing user identity and role claims
- **Mission_Alert**: A time-sensitive job offer pushed to a Technician with a 30-second acceptance countdown
- **Heatmap_Zone**: A geographic area with aggregated demand intensity data for map visualization
- **MarkerData**: A data structure representing a point on the map with position, label, type, and optional category

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user (Client, Technician, or Admin), I want to authenticate with the platform, so that I receive a session token granting role-appropriate access.

#### Acceptance Criteria

1. WHEN a user submits valid credentials (email and password), THE Auth_Service SHALL return a JSON response containing `token` (JWT string), `user` object with `id`, `name`, `email`, `role` (one of "client", "technician", "admin"), and `avatar_url`, and an `expires_at` ISO-8601 timestamp
2. WHEN a user submits invalid credentials, THE Auth_Service SHALL return HTTP 401 with a JSON body containing `error` (string code) and `message` (human-readable description)
3. THE Auth_Service SHALL issue JWTs with a payload containing `sub` (user ID), `role` (user role), `iat` (issued-at Unix timestamp), and `exp` (expiration Unix timestamp)
4. WHEN a request includes an expired or malformed JWT, THE API_Gateway SHALL return HTTP 401 with error code "token_expired" or "token_invalid"
5. WHEN an authenticated user calls the session endpoint (GET /api/auth/me), THE Auth_Service SHALL return the same `user` object structure as the login response without re-issuing a token

### Requirement 2: Role-Based Access Control

**User Story:** As a platform operator, I want the API to enforce role-based access, so that each user can only access endpoints appropriate to their role.

#### Acceptance Criteria

1. WHEN a Client attempts to access Technician-only endpoints (e.g., PATCH /api/technician/availability), THE API_Gateway SHALL return HTTP 403 with error code "forbidden"
2. WHEN a Technician attempts to access Admin-only endpoints (e.g., GET /api/admin/verifications), THE API_Gateway SHALL return HTTP 403 with error code "forbidden"
3. THE API_Gateway SHALL validate the `role` claim in the JWT before processing any role-restricted endpoint
4. WHEN a request lacks an Authorization header on a protected endpoint, THE API_Gateway SHALL return HTTP 401 with error code "unauthorized"

### Requirement 3: Map Marker Data for Requests

**User Story:** As a Client, I want to see active service requests on the map, so that I can understand demand in my area.

#### Acceptance Criteria

1. WHEN a Client calls GET /api/map/requests with query parameters `lat`, `lng`, and `radius_km`, THE Map_Service SHALL return a JSON array of marker objects each containing `id` (string), `position` (array of two numbers [latitude, longitude]), `label` (string description), `type` (literal "request"), and `category` (one of "Electricidad", "Plomería", "Climatización", "General", "Cerrajería")
2. THE Map_Service SHALL return only requests within the specified radius from the given coordinates
3. IF the `lat`, `lng`, or `radius_km` parameters are missing or non-numeric, THEN THE Map_Service SHALL return HTTP 400 with error code "invalid_params"

### Requirement 4: Map Marker Data for Technicians

**User Story:** As a Client or Admin, I want to see active technician positions on the map, so that I can track available professionals nearby.

#### Acceptance Criteria

1. WHEN an authorized user calls GET /api/map/technicians with query parameters `lat`, `lng`, and `radius_km`, THE Map_Service SHALL return a JSON array of marker objects each containing `id` (string), `position` (array of two numbers [latitude, longitude]), `label` (string with technician name and specialty), `type` (literal "technician"), and `status` (one of "available", "en_route", "busy")
2. THE Map_Service SHALL return only technicians within the specified radius who have `status` "available" or "en_route"
3. WHEN the Admin calls GET /api/map/technicians with the additional query parameter `all=true`, THE Map_Service SHALL return all technicians regardless of status

### Requirement 5: Heatmap Zone Data

**User Story:** As a Technician or Admin, I want to see demand heatmap zones on the map, so that I can identify high-demand areas.

#### Acceptance Criteria

1. WHEN an authorized user calls GET /api/map/heatmap with query parameters `lat`, `lng`, and `radius_km`, THE Map_Service SHALL return a JSON array of zone objects each containing `id` (string), `center` (array of two numbers [latitude, longitude]), `radius_m` (number in meters), `intensity` (number between 0.0 and 1.0), and `label` (string zone name)
2. THE Map_Service SHALL calculate intensity based on the ratio of active requests to available technicians in each zone
3. WHILE a Technician has availability set to online, THE Map_Service SHALL include the Technician's current zone intensity in the heatmap response

### Requirement 6: Service Request Creation

**User Story:** As a Client, I want to submit a service request with category, description, location, and photos, so that nearby technicians can see and accept my job.

#### Acceptance Criteria

1. WHEN a Client sends POST /api/requests with a JSON body containing `title` (string, 5-200 chars), `category` (one of "electrical", "plumbing", "hvac", "general", "locksmith", "cleaning"), `description` (string, 0-2000 chars), `location` object with `lat` (number), `lng` (number), and `address` (string), and `images` (array of up to 4 image URLs), THE Request_Service SHALL create the request and return HTTP 201 with the created request object including a generated `id`, `status` "pending", and `created_at` timestamp
2. IF any required field is missing or fails validation, THEN THE Request_Service SHALL return HTTP 422 with an `errors` array where each entry contains `field` (string) and `message` (string)
3. WHEN a request is successfully created, THE Request_Service SHALL include `nearby_technicians_count` (integer) and `estimated_response_min` (integer) in the response body
4. IF the Client is not authenticated, THEN THE API_Gateway SHALL return HTTP 401 before reaching the Request_Service

### Requirement 7: Job Feed for Technicians

**User Story:** As a Technician, I want to see available jobs near me sorted by urgency and distance, so that I can choose which jobs to accept.

#### Acceptance Criteria

1. WHEN a Technician calls GET /api/jobs/available with query parameters `lat`, `lng`, and optional `category` filter, THE Request_Service SHALL return a JSON array of job objects each containing `id` (string), `category` (string), `title` (string), `distance_km` (number with one decimal), `expires_in_min` (integer), `payout` (string formatted as "$min–max"), and `urgent` (boolean)
2. THE Request_Service SHALL sort the job array by urgency first (urgent jobs at top) then by ascending distance
3. THE Request_Service SHALL only return jobs within 10 km of the Technician's provided coordinates
4. WHEN a Technician calls GET /api/jobs/completed with optional `date_from` and `date_to` query parameters, THE Request_Service SHALL return a JSON array of completed job objects each containing `id` (string), `title` (string), `earnings` (string formatted as "$amount"), `rating` (integer 1-5), and `completed_at` (ISO-8601 timestamp)

### Requirement 8: Client Request History

**User Story:** As a Client, I want to see my past and active service requests, so that I can track their status.

#### Acceptance Criteria

1. WHEN a Client calls GET /api/requests/mine with optional `status` filter (one of "active", "completed", "cancelled"), THE Request_Service SHALL return a JSON array of request objects each containing `id` (string), `title` (string), `category` (string), `status` (one of "active", "completed", "cancelled"), `technician` (object with `name` string or null), `created_at` (ISO-8601 timestamp), and `price` (string or null)
2. WHILE a request has status "active", THE Request_Service SHALL include an `eta_minutes` (integer or null) field indicating the assigned technician's estimated arrival time
3. THE Request_Service SHALL sort results by `created_at` descending (most recent first)

### Requirement 9: Admin Transactions Table

**User Story:** As an Admin, I want to view all platform transactions with filtering and export capabilities, so that I can monitor financial activity.

#### Acceptance Criteria

1. WHEN an Admin calls GET /api/admin/transactions with optional query parameters `page` (integer), `per_page` (integer, max 100), `status` (one of "completed", "in_progress", "disputed"), and `date_from`/`date_to` (ISO-8601 dates), THE API_Gateway SHALL return a JSON object containing `data` (array of transaction objects), `total` (integer), `page` (integer), and `per_page` (integer)
2. THE API_Gateway SHALL return each transaction object containing `id` (string), `client` (string name), `technician` (string name), `service` (string category), `amount` (string formatted as "$X.XX"), `commission` (string formatted as "$X.XX"), `status` (one of "completed", "in_progress", "disputed"), and `created_at` (ISO-8601 timestamp)
3. WHEN an Admin calls GET /api/admin/transactions/summary, THE API_Gateway SHALL return a JSON object containing `today_count` (integer), `today_volume` (string formatted as "$X,XXX"), `today_commission` (string formatted as "$XX.XX"), and `disputes_pending` (integer)

### Requirement 10: Admin Technician Verifications

**User Story:** As an Admin, I want to review and approve or reject technician verification requests, so that only qualified professionals join the platform.

#### Acceptance Criteria

1. WHEN an Admin calls GET /api/admin/verifications with optional `status` filter (one of "pending", "approved", "rejected"), THE API_Gateway SHALL return a JSON array of verification objects each containing `id` (string), `name` (string), `specialty` (string), `experience` (string), `documents_count` (integer), and `submitted_at` (ISO-8601 timestamp)
2. WHEN an Admin sends PATCH /api/admin/verifications/:id with body `{ "action": "approve" }`, THE API_Gateway SHALL update the verification status and return HTTP 200 with the updated object
3. WHEN an Admin sends PATCH /api/admin/verifications/:id with body `{ "action": "reject", "reason": "string" }`, THE API_Gateway SHALL update the verification status and return HTTP 200 with the updated object including the rejection reason
4. IF the verification ID does not exist, THEN THE API_Gateway SHALL return HTTP 404 with error code "not_found"

### Requirement 11: Admin Event Log Stream

**User Story:** As an Admin, I want to see a live feed of platform events, so that I can monitor operations in real time.

#### Acceptance Criteria

1. WHEN an Admin calls GET /api/admin/events with optional `limit` (integer, default 20) and `type` filter (one of "info", "success", "warning", "error"), THE API_Gateway SHALL return a JSON array of event objects each containing `id` (string), `time` (ISO-8601 timestamp), `type` (one of "info", "success", "warning", "error"), and `message` (string)
2. THE API_Gateway SHALL sort events by `time` descending (most recent first)
3. WHEN the Admin establishes a WebSocket connection to /ws/admin/events, THE Realtime_Service SHALL push new event objects in real time using the same JSON structure as the REST endpoint

### Requirement 12: Radar Search Real-Time Flow

**User Story:** As a Client, I want to initiate a technician search and receive real-time updates as the system finds available professionals, so that I see the radar animation with live results.

#### Acceptance Criteria

1. WHEN a Client sends a WebSocket message `{ "type": "search:start", "payload": { "lat": number, "lng": number, "category": string, "request_id": string } }` to /ws/client, THE Realtime_Service SHALL begin searching for available technicians and respond with `{ "type": "search:ack", "payload": { "search_id": string } }`
2. WHILE the search is active, THE Realtime_Service SHALL send periodic messages `{ "type": "search:progress", "payload": { "technicians_found": integer, "radius_km": number, "elapsed_seconds": integer } }` every 1 second
3. WHEN a technician is matched, THE Realtime_Service SHALL send `{ "type": "search:match", "payload": { "technician": { "id": string, "name": string, "specialty": string, "rating": number, "avatar_url": string, "distance_km": number, "eta_minutes": integer } } }`
4. IF no technician is found within 30 seconds, THEN THE Realtime_Service SHALL send `{ "type": "search:timeout", "payload": { "message": string } }` and terminate the search

### Requirement 13: Technician Location Tracking

**User Story:** As a Client with an active service request, I want to track my assigned technician's real-time position, so that I see the glassmorphism widget with live ETA.

#### Acceptance Criteria

1. WHILE a Technician is en route to a Client, THE Realtime_Service SHALL push location updates to the Client's WebSocket connection with message `{ "type": "tracking:update", "payload": { "technician_id": string, "position": [number, number], "eta_minutes": integer, "progress_percent": integer, "status": "en_route" } }` every 5 seconds
2. WHEN the Technician arrives at the service location, THE Realtime_Service SHALL send `{ "type": "tracking:arrived", "payload": { "technician_id": string, "arrived_at": string } }` to the Client
3. THE Realtime_Service SHALL send Technician location updates only to the Client who owns the active request associated with that Technician

### Requirement 14: Mission Alert for Technicians

**User Story:** As a Technician, I want to receive time-sensitive job offers with full details and a 30-second countdown, so that I can quickly decide whether to accept.

#### Acceptance Criteria

1. WHEN a new job matches a Technician's location and specialty, THE Realtime_Service SHALL push a WebSocket message `{ "type": "mission:offer", "payload": { "mission_id": string, "title": string, "category": string, "urgent": boolean, "payout": string, "distance_km": number, "expires_in_seconds": 30, "client_location": [number, number] } }` to the Technician's connection
2. WHEN a Technician sends `{ "type": "mission:accept", "payload": { "mission_id": string } }` within the countdown period, THE Realtime_Service SHALL respond with `{ "type": "mission:confirmed", "payload": { "mission_id": string, "client_name": string, "client_address": string, "navigation_url": string } }`
3. WHEN a Technician sends `{ "type": "mission:reject", "payload": { "mission_id": string } }` or the 30-second countdown expires, THE Realtime_Service SHALL reassign the mission to the next available Technician and send `{ "type": "mission:expired", "payload": { "mission_id": string } }` to the original Technician
4. IF the Technician's WebSocket connection drops during an active mission offer, THEN THE Realtime_Service SHALL treat the mission as rejected after a 5-second grace period

### Requirement 15: Technician Availability Toggle

**User Story:** As a Technician, I want to toggle my online/offline availability, so that I only receive job offers when I am ready to work.

#### Acceptance Criteria

1. WHEN a Technician sends PATCH /api/technician/availability with body `{ "online": boolean, "lat": number, "lng": number }`, THE API_Gateway SHALL update the Technician's availability status and return HTTP 200 with `{ "online": boolean, "updated_at": string }`
2. WHILE a Technician has `online` set to false, THE Realtime_Service SHALL NOT send mission offers to that Technician
3. WHEN a Technician sets availability to online, THE Map_Service SHALL include the Technician's position in map marker responses within 5 seconds

### Requirement 16: Admin KPI Dashboard Data

**User Story:** As an Admin, I want to see real-time KPI metrics on the command center, so that I can monitor platform health.

#### Acceptance Criteria

1. WHEN an Admin calls GET /api/admin/kpis, THE API_Gateway SHALL return a JSON object containing `active_services` (integer), `technicians_online` (integer), `revenue_today` (string formatted as "$X,XXX"), `reports_pending` (integer), and each field SHALL include a `delta` (string with percentage or absolute change)
2. WHEN an Admin calls GET /api/admin/performance/weekly, THE API_Gateway SHALL return a JSON object containing `days` (array of 7 objects each with `label` (string day name), `completed` (integer), and `date` (ISO-8601 date))
3. THE API_Gateway SHALL calculate deltas by comparing current values to the previous equivalent period (day-over-day or week-over-week)

### Requirement 17: AI Photo Diagnosis

**User Story:** As a Client, I want to upload a photo of my problem and receive an AI-generated preliminary diagnosis, so that I can provide better context to technicians.

#### Acceptance Criteria

1. WHEN a Client sends POST /api/ai/diagnose with a multipart form containing an image file (max 5MB, PNG or JPG), THE API_Gateway SHALL return a JSON object containing `diagnosis` (string description of detected issue), `confidence` (number between 0.0 and 1.0), `suggested_category` (string matching one of the service categories), and `tags` (array of strings)
2. THE API_Gateway SHALL process the image and return a response within 10 seconds
3. IF the uploaded file exceeds 5MB or is not PNG/JPG format, THEN THE API_Gateway SHALL return HTTP 422 with error code "invalid_file" and a descriptive message

### Requirement 18: WebSocket Connection Management

**User Story:** As a platform user, I want a reliable real-time connection that handles disconnections gracefully, so that I never miss critical updates.

#### Acceptance Criteria

1. WHEN a user connects to /ws/{role} with a valid JWT in the `Authorization` query parameter, THE Realtime_Service SHALL authenticate the connection and send `{ "type": "connection:established", "payload": { "session_id": string } }`
2. IF the JWT is invalid or expired during WebSocket handshake, THEN THE Realtime_Service SHALL reject the connection with WebSocket close code 4001 and reason "authentication_failed"
3. WHILE a WebSocket connection is active, THE Realtime_Service SHALL send `{ "type": "ping" }` every 30 seconds and expect a `{ "type": "pong" }` response within 10 seconds
4. IF a pong response is not received within 10 seconds, THEN THE Realtime_Service SHALL close the connection with code 4002 and reason "heartbeat_timeout"
5. WHEN a client reconnects after disconnection, THE Realtime_Service SHALL deliver any missed events from the last 60 seconds if the client provides `last_event_id` in the connection parameters
