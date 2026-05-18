import { Request, Response } from "express";
import { sequelize, ServiceRequest } from "../models/index.js";
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

interface RequestMarkerRow {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category: string;
}

interface HeatmapRow {
  latitude: number;
  longitude: number;
  request_count: number;
}

/**
 * Validates common map query params (lat, lng, radius_km).
 * Returns parsed values or sends error response.
 */
function parseMapParams(req: Request, res: Response): { lat: number; lng: number; radius: number } | null {
  const { lat, lng, radius_km } = req.query;

  if (!lat || !lng || !radius_km) {
    res.status(400).json({
      error: "Parámetros lat, lng y radius_km son requeridos",
      code: "invalid_params",
    });
    return null;
  }

  const latitude = parseFloat(lat as string);
  const longitude = parseFloat(lng as string);
  const radius = parseFloat(radius_km as string);

  if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
    res.status(400).json({
      error: "lat, lng y radius_km deben ser valores numéricos",
      code: "invalid_params",
    });
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    res.status(400).json({
      error: "Coordenadas fuera de rango válido",
      code: "invalid_params",
    });
    return null;
  }

  if (radius <= 0 || radius > 100) {
    res.status(400).json({
      error: "radius_km debe estar entre 0 y 100",
      code: "invalid_params",
    });
    return null;
  }

  return { lat: latitude, lng: longitude, radius };
}

/**
 * GET /api/map/technicians
 * Returns online technicians within a given radius using Haversine formula.
 */
export async function getTechnicians(req: Request, res: Response): Promise<void> {
  try {
    const params = parseMapParams(req, res);
    if (!params) return;

    const { lat, lng, radius } = params;

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
        replacements: { lat, lng, radius_km: radius },
        type: QueryTypes.SELECT,
      }
    );

    res.status(200).json({ technicians });
  } catch (error) {
    console.error("GetTechnicians error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/map/requests
 * Returns pending service request markers within a given radius.
 */
export async function getRequestMarkers(req: Request, res: Response): Promise<void> {
  try {
    const params = parseMapParams(req, res);
    if (!params) return;

    const { lat, lng, radius } = params;

    const markers = await sequelize.query<RequestMarkerRow>(
      `
      SELECT
        sr.id,
        sr.latitude,
        sr.longitude,
        sr.title,
        sr.category,
        ROUND(
          (6371 * acos(
            cos(radians(:lat)) * cos(radians(sr.latitude)) *
            cos(radians(sr.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(sr.latitude))
          ))::numeric,
          2
        ) AS distance_km
      FROM fixit.service_requests sr
      WHERE sr.status IN ('pending', 'searching')
        AND (6371 * acos(
          cos(radians(:lat)) * cos(radians(sr.latitude)) *
          cos(radians(sr.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(sr.latitude))
        )) <= :radius_km
      ORDER BY sr.created_at DESC
      `,
      {
        replacements: { lat, lng, radius_km: radius },
        type: QueryTypes.SELECT,
      }
    );

    const response = markers.map((m) => ({
      id: m.id,
      position: [m.latitude, m.longitude],
      label: m.title,
      type: "request" as const,
      category: m.category,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetRequestMarkers error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/map/heatmap
 * Returns demand heatmap zones based on request density within radius.
 */
export async function getHeatmap(req: Request, res: Response): Promise<void> {
  try {
    const params = parseMapParams(req, res);
    if (!params) return;

    const { lat, lng, radius } = params;

    // Aggregate requests into zones by rounding coordinates
    const zones = await sequelize.query<HeatmapRow>(
      `
      SELECT
        ROUND(sr.latitude::numeric, 2) AS latitude,
        ROUND(sr.longitude::numeric, 2) AS longitude,
        COUNT(*)::integer AS request_count
      FROM fixit.service_requests sr
      WHERE sr.status IN ('pending', 'searching', 'matched')
        AND (6371 * acos(
          cos(radians(:lat)) * cos(radians(sr.latitude)) *
          cos(radians(sr.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(sr.latitude))
        )) <= :radius_km
      GROUP BY ROUND(sr.latitude::numeric, 2), ROUND(sr.longitude::numeric, 2)
      ORDER BY request_count DESC
      `,
      {
        replacements: { lat, lng, radius_km: radius },
        type: QueryTypes.SELECT,
      }
    );

    // Normalize intensity to [0, 1]
    const maxCount = zones.length > 0 ? Math.max(...zones.map((z) => z.request_count)) : 1;

    const response = zones.map((z, i) => ({
      id: `zone_${i}`,
      center: [z.latitude, z.longitude],
      radius_m: 500,
      intensity: Math.round((z.request_count / maxCount) * 100) / 100,
      label: `${z.request_count} solicitudes`,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetHeatmap error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
