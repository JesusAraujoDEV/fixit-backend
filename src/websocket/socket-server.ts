import { Server as HttpServer } from "node:http";
import { Server, Socket } from "socket.io";
import { verifyToken, type JwtPayload } from "../middleware/auth.middleware.js";

// Extend Socket to include authenticated user data
interface AuthenticatedSocket extends Socket {
  user: JwtPayload;
}

let io: Server;

/**
 * Initializes the Socket.io server on top of the HTTP server.
 * Includes JWT authentication middleware and role-based room management.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
    path: "/ws",
  });

  // ─── Authentication Middleware ───────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token;

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = verifyToken(token);
      (socket as AuthenticatedSocket).user = payload;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  // ─── Connection Handler ──────────────────────────────────────────────
  io.on("connection", (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const { id: userId, role } = socket.user;

    console.log(`🔌 Socket connected: ${userId} (${role})`);

    // Join role-based room
    const roleRoom = `${role}s`; // "clients", "technicians", "admins"
    socket.join(roleRoom);

    // Join individual room for direct messages
    socket.join(`user:${userId}`);

    // Emit connection established event
    socket.emit("connection:established", {
      session_id: socket.id,
      user_id: userId,
      role,
      joined_rooms: [roleRoom, `user:${userId}`],
    });

    // ─── Heartbeat ───────────────────────────────────────────────────
    socket.on("pong", () => {
      // Client responded to heartbeat
    });

    // ─── Client: Search Flow ─────────────────────────────────────────
    if (role === "client") {
      socket.on("search:start", (data: { request_id: string }) => {
        handleSearchStart(socket, data);
      });

      socket.on("search:cancel", (data: { search_id: string }) => {
        socket.emit("search:cancelled", { search_id: data.search_id });
      });
    }

    // ─── Technician: Mission Flow ────────────────────────────────────
    if (role === "technician") {
      socket.on("mission:accept", (data: { mission_id: string }) => {
        handleMissionResponse(socket, data.mission_id, "accepted");
      });

      socket.on("mission:reject", (data: { mission_id: string }) => {
        handleMissionResponse(socket, data.mission_id, "rejected");
      });

      // Location updates from technician
      socket.on("location:update", (data: { lat: number; lng: number }) => {
        handleLocationUpdate(socket, data);
      });
    }

    // ─── Disconnect ──────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`🔌 Socket disconnected: ${userId} (${reason})`);
    });
  });

  // Start heartbeat interval
  startHeartbeat();

  return io;
}

/**
 * Returns the Socket.io server instance.
 */
export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized. Call initSocketServer first.");
  }
  return io;
}

// ─── Handler Functions ───────────────────────────────────────────────────────

/**
 * Handles when a client starts searching for a technician.
 * Emits a mission offer to nearby technicians with a 30s countdown.
 */
function handleSearchStart(
  socket: AuthenticatedSocket,
  data: { request_id: string }
): void {
  const searchId = `search_${Date.now()}_${socket.user.id}`;

  // Acknowledge the search to the client
  socket.emit("search:ack", {
    search_id: searchId,
    request_id: data.request_id,
    status: "searching",
  });

  // Emit mission offer to technicians room
  // In production, this would filter by proximity and availability
  emitMissionOffer({
    mission_id: `mission_${Date.now()}`,
    search_id: searchId,
    request_id: data.request_id,
    client_id: socket.user.id,
    expires_in_seconds: 30,
  });
}

/**
 * Emits a mission offer to the technicians room.
 * Each technician has 30 seconds to accept or reject.
 */
function emitMissionOffer(payload: {
  mission_id: string;
  search_id: string;
  request_id: string;
  client_id: string;
  expires_in_seconds: number;
}): void {
  io.to("technicians").emit("mission:offer", payload);

  // Set expiration timer
  setTimeout(() => {
    io.to("technicians").emit("mission:expired", {
      mission_id: payload.mission_id,
    });

    // Notify client that search timed out
    io.to(`user:${payload.client_id}`).emit("search:timeout", {
      search_id: payload.search_id,
    });
  }, payload.expires_in_seconds * 1000);
}

/**
 * Handles a technician's response to a mission offer.
 */
function handleMissionResponse(
  socket: AuthenticatedSocket,
  missionId: string,
  action: "accepted" | "rejected"
): void {
  if (action === "accepted") {
    // Notify the technician of confirmation
    socket.emit("mission:confirmed", {
      mission_id: missionId,
      status: "confirmed",
    });

    // TODO: Notify the client that a technician accepted
    // TODO: Update service_request status to "matched"
  }
  // If rejected, do nothing — wait for another technician or timeout
}

/**
 * Handles real-time location updates from a technician.
 */
function handleLocationUpdate(
  socket: AuthenticatedSocket,
  data: { lat: number; lng: number }
): void {
  // Broadcast to admins for dashboard tracking
  io.to("admins").emit("tracking:update", {
    technician_id: socket.user.id,
    latitude: data.lat,
    longitude: data.lng,
    timestamp: new Date().toISOString(),
  });

  // TODO: Also emit to the specific client being served
  // TODO: Persist location to technician_profiles.current_location
}

/**
 * Sends periodic heartbeat pings to all connected clients.
 */
function startHeartbeat(): void {
  setInterval(() => {
    io.emit("ping");
  }, 25000); // Every 25 seconds
}
