import { Request, Response } from "express";
import { TechnicianProfile } from "../models/index.js";

/**
 * GET /api/technician/availability
 * Returns the current online status of the authenticated technician.
 */
export async function getAvailability(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    let profile = await TechnicianProfile.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      profile = await TechnicianProfile.create({
        user_id: userId,
        is_online: false,
        is_verified: false,
        rating_average: 0,
      });
    }

    res.status(200).json({
      online: profile.is_online,
      updated_at: profile.updated_at,
    });
  } catch (error) {
    console.error("GetAvailability error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * PATCH /api/technician/availability
 * Toggle technician online/offline status and update location.
 */
export async function updateAvailability(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { online, lat, lng } = req.body;

    if (online === undefined) {
      res.status(400).json({
        error: "El campo 'online' es requerido",
        code: "invalid_params",
      });
      return;
    }

    if (typeof online !== "boolean") {
      res.status(400).json({
        error: "El campo 'online' debe ser booleano",
        code: "invalid_params",
      });
      return;
    }

    // If going online, require coordinates
    if (online && (lat === undefined || lng === undefined)) {
      res.status(400).json({
        error: "lat y lng son requeridos cuando online=true",
        code: "invalid_params",
      });
      return;
    }

    let profile = await TechnicianProfile.findOne({
      where: { user_id: userId },
    });

    // Auto-create profile if it doesn't exist (handles users registered before this feature)
    if (!profile) {
      profile = await TechnicianProfile.create({
        user_id: userId,
        is_online: false,
        is_verified: false,
        rating_average: 0,
      });
    }

    // Update profile
    const updateData: Record<string, unknown> = { is_online: online };

    if (online && lat !== undefined && lng !== undefined) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        res.status(400).json({
          error: "Coordenadas inválidas",
          code: "invalid_params",
        });
        return;
      }

      updateData.current_latitude = latitude;
      updateData.current_longitude = longitude;
    }

    if (!online) {
      updateData.current_latitude = null;
      updateData.current_longitude = null;
    }

    await profile.update(updateData);

    res.status(200).json({
      online: profile.is_online,
      updated_at: profile.updated_at,
    });
  } catch (error) {
    console.error("UpdateAvailability error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
