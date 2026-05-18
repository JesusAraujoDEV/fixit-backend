import { Request, Response } from "express";
import { sequelize } from "../models/index.js";
import { QueryTypes } from "sequelize";

interface TechnicianRow {
  id: string;
  user_id: string;
  full_name: string;
  rating_average: number;
  is_verified: boolean;
  latitude: number;
  longitude: number;
  distance_km: number;
}

/**
 * GET /api/map/technicians
 * Returns online technicians within a given radius using Haversine formula.
 * Query params: lat, lng, radius_km
 *
 * TODO: Migrar a ST_DWithin cuando PostGIS esté disponible para mayor precisión.
 */
export async function getTechnicians(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, radius_km } = req.query;

    // Validate required params
    if (!lat || !lng || !radius_km) {
      res.status(400).json({
        error: "Parámetros lat, lng y radius_km son requeridos",
        code: "invalid_params",
      });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radius = parseFloat(radius_km as string);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
      res.status(400).json({
        error: "lat, lng y radius_km deben ser valores numéricos",
        code: "invalid_params",
      });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      res.status(400).json({
        error: "Coordenadas fuera de rango válido",
        code: "invalid_params",
      });
      return;
    }

    if (radius <= 0 || radius > 100) {
      res.status(400).json({
        error: "radius_km debe estar entre 0 y 100",
        code: "invalid_params",
      });
      return;
    }

    // Haversine formula in SQL for distance calculation (in km)
    // Earth radius ≈ 6371 km
    const technicians = await sequelize.query<TechnicianRow>(
      `
      SELECT
        tp.id,
        tp.user_id,
        u.full_name,
        tp.rating_average,
        tp.is_verified,
        tp.current_latitude AS latitude,
        tp.current_longitude AS longitude,
        ROUND(
          (6371 * acos(
            cos(radians(:lat)) * cos(radians(tp.current_latitude)) *
            cos(radians(tp.current_longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(tp.current_latitude))
          ))::numeric,
          2
        ) AS distance_km
      FROM fixit.technician_profiles tp
      INNER JOIN fixit.users u ON u.id = tp.user_id
      WHERE tp.is_online = TRUE
        AND tp.current_latitude IS NOT NULL
        AND tp.current_longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(:lat)) * cos(radians(tp.current_latitude)) *
          cos(radians(tp.current_longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(tp.current_latitude))
        )) <= :radius_km
      ORDER BY distance_km ASC
      `,
      {
        replacements: {
          lat: latitude,
          lng: longitude,
          radius_km: radius,
        },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({ technicians });
  } catch (error) {
    console.error("GetTechnicians error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}
