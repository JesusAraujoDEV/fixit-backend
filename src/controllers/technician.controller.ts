import { Request, Response } from "express";
import { TechnicianProfile, User } from "../models/index.js";

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
 * GET /api/technician/profile
 * Returns the full technician profile for the authenticated user.
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    let profile = await TechnicianProfile.findOne({
      where: { user_id: userId },
      include: [{ model: User, as: "user", attributes: ["full_name", "email", "phone", "avatar_url"] }],
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
      id: profile.id,
      user_id: profile.user_id,
      bio: profile.bio,
      is_verified: profile.is_verified,
      is_online: profile.is_online,
      rating_average: profile.rating_average,
      current_latitude: profile.current_latitude,
      current_longitude: profile.current_longitude,
      user: (profile as any).user || null,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    });
  } catch (error) {
    console.error("GetProfile error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * PUT /api/technician/profile
 * Update the technician's professional profile.
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { bio, specialty, skills, certifications } = req.body;

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

    const updateData: Record<string, unknown> = {};
    if (bio !== undefined) updateData.bio = bio;

    await profile.update(updateData);

    // Also update user's full_name/phone if provided
    if (req.body.full_name || req.body.phone || req.body.avatar_url) {
      const userUpdate: Record<string, unknown> = {};
      if (req.body.full_name) userUpdate.full_name = req.body.full_name;
      if (req.body.phone) userUpdate.phone = req.body.phone;
      if (req.body.avatar_url) userUpdate.avatar_url = req.body.avatar_url;
      await User.update(userUpdate, { where: { id: userId } });
    }

    res.status(200).json({
      id: profile.id,
      bio: profile.bio,
      is_verified: profile.is_verified,
      rating_average: profile.rating_average,
      updated_at: profile.updated_at,
    });
  } catch (error) {
    console.error("UpdateProfile error:", error);
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
