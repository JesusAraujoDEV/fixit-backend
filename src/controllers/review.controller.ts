import { Request, Response } from "express";
import { Review, ServiceRequest, User, TechnicianProfile, sequelize } from "../models/index.js";
import { QueryTypes } from "sequelize";

/**
 * POST /api/reviews
 * Create a review for a completed service request.
 * Client reviews technician, or technician reviews client.
 */
export async function createReview(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { service_request_id, rating, comment } = req.body;

    if (!service_request_id || !rating) {
      res.status(400).json({
        error: "service_request_id y rating son requeridos",
        code: "invalid_params",
      });
      return;
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      res.status(422).json({
        error: "rating debe ser un número entre 1 y 5",
        code: "invalid_params",
        errors: [{ field: "rating", message: "Debe ser entre 1 y 5" }],
      });
      return;
    }

    // Find the service request
    const serviceRequest = await ServiceRequest.findByPk(service_request_id);

    if (!serviceRequest) {
      res.status(404).json({
        error: "Solicitud de servicio no encontrada",
        code: "not_found",
      });
      return;
    }

    // Only completed requests can be reviewed
    if (serviceRequest.status !== "completed") {
      res.status(400).json({
        error: "Solo se pueden calificar servicios completados",
        code: "invalid_params",
      });
      return;
    }

    // Determine who is being reviewed
    let reviewedId: string;

    if (userId === serviceRequest.client_id) {
      // Client is reviewing the technician
      if (!serviceRequest.technician_id) {
        res.status(400).json({
          error: "No hay técnico asignado a esta solicitud",
          code: "invalid_params",
        });
        return;
      }
      reviewedId = serviceRequest.technician_id;
    } else if (userId === serviceRequest.technician_id) {
      // Technician is reviewing the client
      reviewedId = serviceRequest.client_id;
    } else {
      res.status(403).json({
        error: "No tienes permisos para calificar esta solicitud",
        code: "forbidden",
      });
      return;
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      where: {
        service_request_id,
        reviewer_id: userId,
      },
    });

    if (existingReview) {
      res.status(409).json({
        error: "Ya calificaste esta solicitud",
        code: "already_reviewed",
      });
      return;
    }

    // Create the review
    const review = await Review.create({
      service_request_id,
      reviewer_id: userId,
      reviewed_id: reviewedId,
      rating: Math.round(rating),
      comment: comment || null,
    });

    // Update technician's rating_average if the reviewed is a technician
    const reviewedUser = await User.findByPk(reviewedId);
    if (reviewedUser && reviewedUser.role === "technician") {
      const [avgResult] = await sequelize.query<{ avg_rating: string }>(
        `SELECT ROUND(AVG(rating)::numeric, 2) AS avg_rating
         FROM fixit.reviews WHERE reviewed_id = :reviewed_id`,
        { replacements: { reviewed_id: reviewedId }, type: QueryTypes.SELECT }
      );

      if (avgResult) {
        await TechnicianProfile.update(
          { rating_average: parseFloat(avgResult.avg_rating) },
          { where: { user_id: reviewedId } }
        );
      }
    }

    res.status(201).json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      reviewed_id: reviewedId,
      created_at: review.created_at,
    });
  } catch (error) {
    console.error("CreateReview error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/reviews/user/:userId
 * Get reviews received by a specific user.
 */
export async function getUserReviews(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;

    const reviews = await Review.findAll({
      where: { reviewed_id: userId as string },
      include: [
        { model: User, as: "reviewer", attributes: ["full_name", "avatar_url"] },
      ],
      order: [["created_at", "DESC"]],
      limit: 50,
    });

    const response = reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      reviewer: (r as any).reviewer
        ? { name: (r as any).reviewer.full_name, avatar_url: (r as any).reviewer.avatar_url }
        : null,
      created_at: r.created_at,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetUserReviews error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/users/me/stats
 * Returns rating and stats for the authenticated user.
 */
export async function getMyStats(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Get average rating received
    const [ratingResult] = await sequelize.query<{ avg_rating: string; total_reviews: string }>(
      `SELECT
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS avg_rating,
        COUNT(*)::integer AS total_reviews
       FROM fixit.reviews
       WHERE reviewed_id = :user_id`,
      { replacements: { user_id: userId }, type: QueryTypes.SELECT }
    );

    // Get request counts
    const [countsResult] = await sequelize.query<{
      active_count: string;
      completed_count: string;
      total_count: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status IN ('pending', 'searching', 'matched', 'in_progress'))::integer AS active_count,
        COUNT(*) FILTER (WHERE status = 'completed')::integer AS completed_count,
        COUNT(*)::integer AS total_count
       FROM fixit.service_requests
       WHERE client_id = :user_id OR technician_id = :user_id`,
      { replacements: { user_id: userId }, type: QueryTypes.SELECT }
    );

    res.status(200).json({
      rating_average: parseFloat(ratingResult?.avg_rating || "0"),
      total_reviews: parseInt(ratingResult?.total_reviews || "0"),
      active_requests: parseInt(countsResult?.active_count || "0"),
      completed_requests: parseInt(countsResult?.completed_count || "0"),
      total_requests: parseInt(countsResult?.total_count || "0"),
    });
  } catch (error) {
    console.error("GetMyStats error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
