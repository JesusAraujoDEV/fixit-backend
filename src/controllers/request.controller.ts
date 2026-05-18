import { Request, Response } from "express";
import { ServiceRequest, User, sequelize } from "../models/index.js";
import { SERVICE_CATEGORIES, type ServiceCategory } from "../models/service-request.model.js";
import { QueryTypes } from "sequelize";

/**
 * POST /api/requests
 * Creates a new service request (ticket) for a client.
 */
export async function createRequest(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { title, description, category, images, latitude, longitude } = req.body;

    if (!title || !category || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        error: "title, category, latitude y longitude son requeridos",
        code: "invalid_params",
      });
      return;
    }

    if (title.length < 5 || title.length > 200) {
      res.status(422).json({
        error: "El título debe tener entre 5 y 200 caracteres",
        code: "invalid_params",
        errors: [{ field: "title", message: "Debe tener entre 5 y 200 caracteres" }],
      });
      return;
    }

    if (!SERVICE_CATEGORIES.includes(category as ServiceCategory)) {
      res.status(422).json({
        error: `Categoría inválida. Opciones: ${SERVICE_CATEGORIES.join(", ")}`,
        code: "invalid_params",
        errors: [{ field: "category", message: "Categoría no válida" }],
      });
      return;
    }

    if (images && (!Array.isArray(images) || images.length > 4)) {
      res.status(422).json({
        error: "Máximo 4 imágenes permitidas",
        code: "invalid_params",
        errors: [{ field: "images", message: "Máximo 4 imágenes" }],
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(422).json({
        error: "Coordenadas inválidas",
        code: "invalid_params",
        errors: [{ field: "location", message: "Coordenadas fuera de rango" }],
      });
      return;
    }

    const serviceRequest = await ServiceRequest.create({
      client_id: userId,
      title,
      description: description || "",
      category: category as ServiceCategory,
      images: images || [],
      latitude: lat,
      longitude: lng,
    });

    // Count nearby online technicians (within 10km) using Haversine
    const [countResult] = await sequelize.query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM fixit.technician_profiles
      WHERE is_online = TRUE
        AND current_latitude IS NOT NULL
        AND current_longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians(:lat)) * cos(radians(current_latitude)) *
          cos(radians(current_longitude) - radians(:lng)) +
          sin(radians(:lat)) * sin(radians(current_latitude))
        )) <= 10
      `,
      {
        replacements: { lat, lng },
        type: QueryTypes.SELECT,
      }
    );

    const nearbyCount = parseInt(countResult?.count || "0", 10);

    res.status(201).json({
      id: serviceRequest.id,
      status: serviceRequest.status,
      created_at: serviceRequest.created_at,
      nearby_technicians_count: nearbyCount,
      estimated_response_min: nearbyCount > 0 ? Math.max(3, Math.ceil(15 / nearbyCount)) : null,
    });
  } catch (error) {
    console.error("CreateRequest error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/requests/mine
 * Returns the authenticated client's request history.
 * Query params: status (optional: "active" | "completed" | "cancelled")
 */
export async function getMyRequests(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const statusFilter = req.query.status as string | undefined;

    const where: Record<string, unknown> = { client_id: userId };

    if (statusFilter) {
      // Map frontend status to DB statuses
      const statusMap: Record<string, string[]> = {
        active: ["pending", "searching", "matched", "in_progress"],
        completed: ["completed"],
        cancelled: ["cancelled"],
      };

      if (!statusMap[statusFilter]) {
        res.status(400).json({
          error: "status debe ser 'active', 'completed' o 'cancelled'",
          code: "invalid_params",
        });
        return;
      }

      where.status = statusMap[statusFilter];
    }

    const requests = await ServiceRequest.findAll({
      where,
      include: [
        { model: User, as: "technician", attributes: ["full_name"] },
      ],
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    const response = requests.map((r) => {
      const isActive = ["pending", "searching", "matched", "in_progress"].includes(r.status);
      let displayStatus: "active" | "completed" | "cancelled";

      if (r.status === "completed") displayStatus = "completed";
      else if (r.status === "cancelled") displayStatus = "cancelled";
      else displayStatus = "active";

      return {
        id: r.id,
        title: r.title,
        category: r.category,
        status: displayStatus,
        technician: (r as any).technician ? { name: (r as any).technician.full_name } : null,
        created_at: r.created_at,
        price: r.price_estimated ? `$${r.price_estimated}` : null,
        eta_minutes: isActive ? Math.floor(Math.random() * 15) + 5 : undefined, // TODO: real ETA calculation
      };
    });

    res.status(200).json(response);
  } catch (error) {
    console.error("GetMyRequests error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
