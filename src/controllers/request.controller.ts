import { Request, Response } from "express";
import { ServiceRequest, TechnicianProfile, sequelize } from "../models/index.js";
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

    // Validate required fields
    if (!title || !category || latitude === undefined || longitude === undefined) {
      res.status(400).json({
        error: "title, category, latitude y longitude son requeridos",
        code: "invalid_params",
      });
      return;
    }

    // Validate title length
    if (title.length < 5 || title.length > 200) {
      res.status(422).json({
        error: "El título debe tener entre 5 y 200 caracteres",
        code: "invalid_params",
        errors: [{ field: "title", message: "Debe tener entre 5 y 200 caracteres" }],
      });
      return;
    }

    // Validate category
    if (!SERVICE_CATEGORIES.includes(category as ServiceCategory)) {
      res.status(422).json({
        error: `Categoría inválida. Opciones: ${SERVICE_CATEGORIES.join(", ")}`,
        code: "invalid_params",
        errors: [{ field: "category", message: "Categoría no válida" }],
      });
      return;
    }

    // Validate images array
    if (images && (!Array.isArray(images) || images.length > 4)) {
      res.status(422).json({
        error: "Máximo 4 imágenes permitidas",
        code: "invalid_params",
        errors: [{ field: "images", message: "Máximo 4 imágenes" }],
      });
      return;
    }

    // Validate coordinates
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

    // Create the service request with PostGIS point
    const serviceRequest = await ServiceRequest.create({
      client_id: userId,
      title,
      description: description || "",
      category: category as ServiceCategory,
      images: images || [],
      location: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
      },
    });

    // Count nearby online technicians (within 10km)
    const [countResult] = await sequelize.query<{ count: string }>(
      `
      SELECT COUNT(*) as count
      FROM fixit.technician_profiles
      WHERE is_online = TRUE
        AND current_location IS NOT NULL
        AND ST_DWithin(
          current_location::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          10000
        )
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
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}
