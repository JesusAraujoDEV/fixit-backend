import { Request, Response } from "express";
import { sequelize, ServiceRequest, User, PlatformEvent } from "../models/index.js";
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
 * Query params: lat, lng, category (optional), max_distance (optional, default 10km)
 */
export async function getAvailableJobs(req: Request, res: Response): Promise<void> {
  try {
    const { lat, lng, category, max_distance } = req.query;

    if (!lat || !lng) {
      res.status(400).json({
        error: "Parámetros lat y lng son requeridos",
        code: "invalid_params",
      });
      return;
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const maxDist = max_distance ? parseFloat(max_distance as string) : 10;

    if (isNaN(latitude) || isNaN(longitude)) {
      res.status(400).json({
        error: "lat y lng deben ser valores numéricos",
        code: "invalid_params",
      });
      return;
    }

    let categoryFilter = "";
    const replacements: Record<string, unknown> = { lat: latitude, lng: longitude, max_distance: maxDist };

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
        )) <= :max_distance
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
      const expiresIn = Math.max(0, 60 - minutesAgo);
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
 * GET /api/jobs/:jobId
 * Returns full details of a specific job/service request.
 */
export async function getJobById(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;

    const job = await ServiceRequest.findByPk(jobId as string, {
      include: [
        { model: User, as: "client", attributes: ["full_name", "phone", "avatar_url"] },
        { model: User, as: "technician", attributes: ["full_name", "phone", "avatar_url"] },
      ],
    });

    if (!job) {
      res.status(404).json({
        error: "Solicitud no encontrada",
        code: "not_found",
      });
      return;
    }

    res.status(200).json({
      id: job.id,
      title: job.title,
      category: job.category,
      description: job.description,
      images: job.images || [],
      status: job.status,
      price_estimated: job.price_estimated,
      latitude: job.latitude,
      longitude: job.longitude,
      created_at: job.created_at,
      updated_at: job.updated_at,
      client: (job as any).client
        ? {
            name: (job as any).client.full_name,
            phone: (job as any).client.phone,
            avatar_url: (job as any).client.avatar_url,
          }
        : null,
      technician: (job as any).technician
        ? {
            name: (job as any).technician.full_name,
            phone: (job as any).technician.phone,
            avatar_url: (job as any).technician.avatar_url,
          }
        : null,
    });
  } catch (error) {
    console.error("GetJobById error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * POST /api/jobs/:jobId/accept
 * Technician accepts an available job directly.
 */
export async function acceptJob(req: Request, res: Response): Promise<void> {
  try {
    const technicianId = req.user!.id;
    const { jobId } = req.params;

    const job = await ServiceRequest.findByPk(jobId as string);

    if (!job) {
      res.status(404).json({
        error: "Solicitud no encontrada",
        code: "not_found",
      });
      return;
    }

    // Only pending/searching jobs can be accepted
    if (!["pending", "searching"].includes(job.status)) {
      res.status(400).json({
        error: "Esta solicitud ya no está disponible",
        code: "job_unavailable",
      });
      return;
    }

    // Check if already assigned to another technician
    if (job.technician_id) {
      res.status(409).json({
        error: "Esta solicitud ya fue aceptada por otro técnico",
        code: "already_taken",
      });
      return;
    }

    // Assign technician and update status
    await job.update({
      technician_id: technicianId,
      status: "matched",
    });

    // Log the event
    await PlatformEvent.create({
      type: "success",
      message: `Técnico ${technicianId} aceptó solicitud ${job.title}`,
      metadata: { job_id: jobId, technician_id: technicianId },
    });

    const missionId = `mission_${Date.now()}_${jobId}`;

    res.status(200).json({
      mission_id: missionId,
      job_id: job.id,
      status: "accepted",
      title: job.title,
      category: job.category,
      latitude: job.latitude,
      longitude: job.longitude,
    });
  } catch (error) {
    console.error("AcceptJob error:", error);
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
      rating: 5,
      completed_at: job.completed_at,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetCompletedJobs error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
