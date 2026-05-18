/**
 * WebSocket message API Zod validation schemas
 * @module api/schemas/websocket
 */

import { z } from "zod";

/** Position tuple: [latitude, longitude] */
const positionSchema = z.tuple([z.number(), z.number()]);

// ─── Connection ─────────────────────────────────────────────────────────────

/** Schema for connection:established message */
export const wsConnectionEstablishedSchema = z.object({
  type: z.literal("connection:established"),
  payload: z.object({
    session_id: z.string().min(1),
  }),
});

// ─── Heartbeat ──────────────────────────────────────────────────────────────

/** Schema for ping message */
export const wsPingSchema = z.object({
  type: z.literal("ping"),
});

/** Schema for pong message */
export const wsPongSchema = z.object({
  type: z.literal("pong"),
});

// ─── Radar Search ───────────────────────────────────────────────────────────

/** Schema for search:start message (Client → Server) */
export const wsSearchStartSchema = z.object({
  type: z.literal("search:start"),
  payload: z.object({
    lat: z.number(),
    lng: z.number(),
    category: z.string(),
    request_id: z.string(),
  }),
});

/** Schema for search:ack message (Server → Client) */
export const wsSearchAckSchema = z.object({
  type: z.literal("search:ack"),
  payload: z.object({
    search_id: z.string().min(1),
  }),
});

/** Schema for search:progress message (Server → Client) */
export const wsSearchProgressSchema = z.object({
  type: z.literal("search:progress"),
  payload: z.object({
    technicians_found: z.number().int().min(0),
    radius_km: z.number().min(0),
    elapsed_seconds: z.number().int().min(0),
  }),
});

/** Schema for search:match message (Server → Client) */
export const wsSearchMatchSchema = z.object({
  type: z.literal("search:match"),
  payload: z.object({
    technician: z.object({
      id: z.string(),
      name: z.string(),
      specialty: z.string(),
      rating: z.number().min(0).max(5),
      avatar_url: z.string(),
      distance_km: z.number().min(0),
      eta_minutes: z.number().int().min(0),
    }),
  }),
});

/** Schema for search:timeout message (Server → Client) */
export const wsSearchTimeoutSchema = z.object({
  type: z.literal("search:timeout"),
  payload: z.object({
    message: z.string(),
  }),
});

// ─── Location Tracking ──────────────────────────────────────────────────────

/** Schema for tracking:update message (Server → Client) */
export const wsTrackingUpdateSchema = z.object({
  type: z.literal("tracking:update"),
  payload: z.object({
    technician_id: z.string(),
    position: positionSchema,
    eta_minutes: z.number().int().min(0),
    progress_percent: z.number().int().min(0).max(100),
    status: z.literal("en_route"),
  }),
});

/** Schema for tracking:arrived message (Server → Client) */
export const wsTrackingArrivedSchema = z.object({
  type: z.literal("tracking:arrived"),
  payload: z.object({
    technician_id: z.string(),
    arrived_at: z.string().datetime(),
  }),
});

// ─── Mission Alerts ─────────────────────────────────────────────────────────

/** Schema for mission:offer message (Server → Technician) */
export const wsMissionOfferSchema = z.object({
  type: z.literal("mission:offer"),
  payload: z.object({
    mission_id: z.string(),
    title: z.string(),
    category: z.string(),
    urgent: z.boolean(),
    payout: z.string(),
    distance_km: z.number().min(0),
    expires_in_seconds: z.literal(30),
    client_location: positionSchema,
  }),
});

/** Schema for mission:accept message (Technician → Server) */
export const wsMissionAcceptSchema = z.object({
  type: z.literal("mission:accept"),
  payload: z.object({
    mission_id: z.string(),
  }),
});

/** Schema for mission:reject message (Technician → Server) */
export const wsMissionRejectSchema = z.object({
  type: z.literal("mission:reject"),
  payload: z.object({
    mission_id: z.string(),
  }),
});

/** Schema for mission:confirmed message (Server → Technician) */
export const wsMissionConfirmedSchema = z.object({
  type: z.literal("mission:confirmed"),
  payload: z.object({
    mission_id: z.string(),
    client_name: z.string(),
    client_address: z.string(),
    navigation_url: z.string(),
  }),
});

/** Schema for mission:expired message (Server → Technician) */
export const wsMissionExpiredSchema = z.object({
  type: z.literal("mission:expired"),
  payload: z.object({
    mission_id: z.string(),
  }),
});

// ─── Discriminated Unions ───────────────────────────────────────────────────

/** Schema for all Client → Server messages */
export const wsClientToServerMessageSchema = z.discriminatedUnion("type", [
  wsSearchStartSchema,
  wsMissionAcceptSchema,
  wsMissionRejectSchema,
  wsPongSchema,
]);

/** Schema for all Server → Client messages (client channel) */
export const wsServerToClientMessageSchema = z.discriminatedUnion("type", [
  wsConnectionEstablishedSchema,
  wsPingSchema,
  wsSearchAckSchema,
  wsSearchProgressSchema,
  wsSearchMatchSchema,
  wsSearchTimeoutSchema,
  wsTrackingUpdateSchema,
  wsTrackingArrivedSchema,
]);

/** Schema for all Server → Technician messages */
export const wsServerToTechnicianMessageSchema = z.discriminatedUnion("type", [
  wsConnectionEstablishedSchema,
  wsPingSchema,
  wsMissionOfferSchema,
  wsMissionConfirmedSchema,
  wsMissionExpiredSchema,
]);

/** Schema for any WebSocket message */
export const wsMessageSchema = z.discriminatedUnion("type", [
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
]);
