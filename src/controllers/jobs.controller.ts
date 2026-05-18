import { Request, Response } from "express";
import { sequelize, ServiceRequest, Transaction } from "../models/index.js";
import { QueryTypes } from "sequelize";

interface AvailableJobRow {
  id: string;
  category: string;
  title: string;
  distance_km: number;
  created_at: string;
  price_estimated: number | null;
  status: string;
}

/**
 * GET /api/jobs/available
 * Returns available jobs near the technician's location.
 * Query params: lat, lng, category (optional)
 */
export async function getAvailableJobs(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, category } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        error: "Parámetros lat y lng son requeridos",
        code: "invalid_params",
      });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        error: "lat y lng deben ser valores numéricos",
        code: "invalid_params",
      });
      return;
    }

    let categoryFilter = "";
    const replacements: Record<string, unknown> = { lat: latitude, lng: longitude };

    if (category && typeof category === "string") {
      categoryFilter = "AND sr.category = :category";
      replacements.category = category;
    }

    const jobs = await sequelize.query<AvailableJobRow>(
      `
      SELECT
        sr.id,
        sr.category,
        sr.title,
        sr.price_estimated,
        sr.created_at,
        sr.status,
        ROUND(
          (6371 * acos(
            cos(radians(:lat)) * cos(radians(sr.latitude)) *
            cos(radians(sr.longitude) - radians(:lng)) +
            sin(radians(:lat)) * sin(radians(sr.latitude))
          ))::numeric,
          1
        ) AS distance_km
      FROM fixit.service_requests sr
      WHERE sr.status IN ('pending', 'searching')
        AND sr.technician_id IS NULL
        ${categoryFilter}
        AND (6371 * acos(
          cos(radians(:lat)) * cos(radians(sr.latitude)) *
          cos(radians(sr.longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(sr.latitude))
        )) <= 10
      ORDER BY
        CASE WHEN sr.created_at < NOW() - INTERVAL '15 minutes' THEN 0 ELSE 1 END ASC,
        distance_km ASC
      LIMIT 20
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const response = jobs.map((job) => {
      const createdAt = new Date(job.created_at);
      const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);
      const expiresIn = Math.max(0, 60 - minutesAgo); // 1 hour expiry
      const urgent = minutesAgo > 15;

      return {
        id: job.id,
        category: job.category,
        title: job.title,
        distance_km: Number(job.distance_km),
        expires_in_min: expiresIn,
        payout: job.price_estimated ? `$${job.price_estimated}` : "$15–50",
        urgent,
      };
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("GetAvailableJobs error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/jobs/completed
 * Returns completed jobs for the authenticated technician.
 * Query params: date_from, date_to (optional, ISO-8601)
 */
export async function getCompletedJobs(req: Request, res: Response): Promise<void> {
  try {
    const technicianId = req.user!.id;
    const { date_from, date_to } = req.query;

    const where: Record<string, unknown> = {
      technician_id: technicianId,
      status: "completed",
    };

    // Build date filters
    let dateFilter = "";
    const replacements: Record<string, unknown> = { technician_id: technicianId };

    if (date_from) {
      dateFilter += " AND sr.updated_at >= :date_from";
      replacements.date_from = date_from;
    }
    if (date_to) {
      dateFilter += " AND sr.updated_at <= :date_to";
      replacements.date_to = date_to;
    }

    const jobs = await sequelize.query<{
      id: string;
      title: string;
      amount: string | null;
      rating: number | null;
      completed_at: string;
    }>(
      `
      SELECT
        sr.id,
        sr.title,
        t.amount,
        sr.updated_at AS completed_at
      FROM fixit.service_requests sr
      LEFT JOIN fixit.transactions t ON t.service_request_id = sr.id
      WHERE sr.technician_id = :technician_id
        AND sr.status = 'completed'
        ${dateFilter}
      ORDER BY sr.updated_at DESC
      LIMIT 50
      `,
      {
        replacements,
        type: QueryTypes.SELECT,
      }
    );

    const response = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      earnings: job.amount ? `$${job.amount}` : "$0",
      rating: 5, // TODO: implement ratings table
      completed_at: job.completed_at,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetCompletedJobs error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
