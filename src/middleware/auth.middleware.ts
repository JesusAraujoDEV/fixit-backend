import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "../models/user.model.js";

export interface JwtPayload {
  id: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Extend Express Request to include authenticated user data
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "fixit-dev-secret-change-in-production";

/**
 * Middleware that validates JWT from Authorization header.
 * Attaches decoded payload to `req.user`.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Token de autenticación requerido",
      code: "unauthorized",
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: "Token expirado",
        code: "token_expired",
      });
      return;
    }
    res.status(401).json({
      error: "Token inválido",
      code: "token_invalid",
    });
  }
}

/**
 * Middleware factory that restricts access to specific roles.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "No autenticado",
        code: "unauthorized",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "No tienes permisos para acceder a este recurso",
        code: "forbidden",
      });
      return;
    }

    next();
  };
}

/**
 * Signs a JWT for a given user.
 */
export function signToken(payload: { id: string; role: UserRole }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

/**
 * Verifies and decodes a JWT token (used by Socket.io middleware).
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
