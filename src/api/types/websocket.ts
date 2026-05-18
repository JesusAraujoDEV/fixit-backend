/**
 * WebSocket message API contract types
 * @module api/types/websocket
 */

// ─── Connection ─────────────────────────────────────────────────────────────

/** Server → Client: Connection confirmed */
export interface WSConnectionEstablished {
  type: "connection:established";
  payload: { session_id: string };
}

// ─── Heartbeat ──────────────────────────────────────────────────────────────

/** Server → Client: Heartbeat check */
export interface WSPing {
  type: "ping";
}

/** Client → Server: Heartbeat response */
export interface WSPong {
  type: "pong";
}

// ─── Radar Search ───────────────────────────────────────────────────────────

/** Client → Server: Initiate radar search */
export interface WSSearchStart {
  type: "search:start";
  payload: {
    lat: number;
    lng: number;
    category: string;
    request_id: string;
  };
}

/** Server → Client: Search initiated acknowledgment */
export interface WSSearchAck {
  type: "search:ack";
  payload: { search_id: string };
}

/** Server → Client: Search progress update */
export interface WSSearchProgress {
  type: "search:progress";
  payload: {
    technicians_found: number;
    radius_km: number;
    elapsed_seconds: number;
  };
}

/** Server → Client: Technician matched */
export interface WSSearchMatch {
  type: "search:match";
  payload: {
    technician: {
      id: string;
      name: string;
      specialty: string;
      rating: number;
      avatar_url: string;
      distance_km: number;
      eta_minutes: number;
    };
  };
}

/** Server → Client: No match found within timeout */
export interface WSSearchTimeout {
  type: "search:timeout";
  payload: { message: string };
}

// ─── Location Tracking ──────────────────────────────────────────────────────

/** Server → Client: Technician location update */
export interface WSTrackingUpdate {
  type: "tracking:update";
  payload: {
    technician_id: string;
    position: [number, number];
    eta_minutes: number;
    progress_percent: number;
    status: "en_route";
  };
}

/** Server → Client: Technician arrived */
export interface WSTrackingArrived {
  type: "tracking:arrived";
  payload: {
    technician_id: string;
    arrived_at: string;
  };
}

// ─── Mission Alerts ─────────────────────────────────────────────────────────

/** Server → Technician: Job offer */
export interface WSMissionOffer {
  type: "mission:offer";
  payload: {
    mission_id: string;
    title: string;
    category: string;
    urgent: boolean;
    payout: string;
    distance_km: number;
    expires_in_seconds: 30;
    client_location: [number, number];
  };
}

/** Technician → Server: Accept mission */
export interface WSMissionAccept {
  type: "mission:accept";
  payload: { mission_id: string };
}

/** Technician → Server: Reject mission */
export interface WSMissionReject {
  type: "mission:reject";
  payload: { mission_id: string };
}

/** Server → Technician: Mission accepted confirmation */
export interface WSMissionConfirmed {
  type: "mission:confirmed";
  payload: {
    mission_id: string;
    client_name: string;
    client_address: string;
    navigation_url: string;
  };
}

/** Server → Technician: Mission expired/rejected */
export interface WSMissionExpired {
  type: "mission:expired";
  payload: { mission_id: string };
}

// ─── Discriminated Unions ───────────────────────────────────────────────────

/** All messages that can be sent from Client to Server */
export type WSClientToServerMessage =
  | WSSearchStart
  | WSMissionAccept
  | WSMissionReject
  | WSPong;

/** All messages that can be sent from Server to Client (client channel) */
export type WSServerToClientMessage =
  | WSConnectionEstablished
  | WSPing
  | WSSearchAck
  | WSSearchProgress
  | WSSearchMatch
  | WSSearchTimeout
  | WSTrackingUpdate
  | WSTrackingArrived;

/** All messages that can be sent from Server to Technician */
export type WSServerToTechnicianMessage =
  | WSConnectionEstablished
  | WSPing
  | WSMissionOffer
  | WSMissionConfirmed
  | WSMissionExpired;

/** All possible WebSocket message types (union) */
export type WSMessage =
  | WSConnectionEstablished
  | WSPing
  | WSPong
  | WSSearchStart
  | WSSearchAck
  | WSSearchProgress
  | WSSearchMatch
  | WSSearchTimeout
  | WSTrackingUpdate
  | WSTrackingArrived
  | WSMissionOffer
  | WSMissionAccept
  | WSMissionReject
  | WSMissionConfirmed
  | WSMissionExpired;
