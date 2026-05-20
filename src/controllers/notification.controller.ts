import { Request, Response } from "express";
import { sequelize, PlatformEvent } from "../models/index.js";
import { QueryTypes } from "sequelize";

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user.
 * For now, returns recent platform events relevant to the user.
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    // Get notifications: platform events + job-related events for this user
    const notifications = await sequelize.query<{
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      created_at: string;
    }>(
      `
      SELECT
        pe.id,
        pe.type,
        CASE pe.type
          WHEN 'success' THEN 'Servicio completado'
          WHEN 'warning' THEN 'Atención requerida'
          WHEN 'error' THEN 'Error en servicio'
          ELSE 'Información'
        END AS title,
        pe.message,
        FALSE AS read,
        pe.created_at
      FROM fixit.platform_events pe
      WHERE pe.metadata->>'technician_id' = :user_id
         OR pe.metadata->>'client_id' = :user_id
         OR pe.metadata->>'user_id' = :user_id
      ORDER BY pe.created_at DESC
      LIMIT :limit
      `,
      {
        replacements: { user_id: userId, limit },
        type: QueryTypes.SELECT,
      }
    );

    // If no personalized notifications, return recent general ones
    if (notifications.length === 0) {
      const general = await PlatformEvent.findAll({
        order: [["created_at", "DESC"]],
        limit,
      });

      const response = general.map((e) => ({
        id: e.id,
        type: e.type,
        title: e.type === "success" ? "Actualización" : "Información",
        message: e.message,
        read: false,
        created_at: e.created_at,
      }));

      res.status(200).json(response);
      return;
    }

    res.status(200).json(notifications);
  } catch (error) {
    console.error("GetNotifications error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
