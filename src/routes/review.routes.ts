import { Router } from "express";
import { createReview, getUserReviews, getMyStats } from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Crear reseña
 *     description: >
 *       Califica un servicio completado. El cliente califica al técnico
 *       y el técnico califica al cliente. Solo una reseña por usuario por servicio.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service_request_id, rating]
 *             properties:
 *               service_request_id:
 *                 type: string
 *                 format: uuid
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *                 description: Comentario opcional
 *     responses:
 *       201:
 *         description: Reseña creada
 *       400:
 *         description: Servicio no completado o parámetros inválidos
 *       403:
 *         description: No participaste en este servicio
 *       404:
 *         description: Solicitud no encontrada
 *       409:
 *         description: Ya calificaste esta solicitud
 */
router.post("/", authenticate, createReview);

/**
 * @openapi
 * /api/reviews/user/{userId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Reseñas recibidas por un usuario
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array de reseñas
 */
router.get("/user/:userId", authenticate, getUserReviews);

/**
 * @openapi
 * /api/users/me/stats:
 *   get:
 *     tags: [Users]
 *     summary: Estadísticas y rating del usuario autenticado
 *     description: Retorna rating promedio, total de reseñas y conteos de solicitudes.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Stats del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rating_average: { type: number, example: 4.75 }
 *                 total_reviews: { type: integer, example: 12 }
 *                 active_requests: { type: integer }
 *                 completed_requests: { type: integer }
 *                 total_requests: { type: integer }
 */
router.get("/me/stats", authenticate, getMyStats);

export default router;
