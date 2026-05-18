import { Request, Response } from "express";
import { TechnicianProfile } from "../models/index.js";

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

    const profile = await TechnicianProfile.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      res.status(404).json({
        error: "Perfil de técnico no encontrado",
        code: "not_found",
      });
      return;
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
