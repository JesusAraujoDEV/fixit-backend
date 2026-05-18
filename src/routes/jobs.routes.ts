import { Router } from "express";
import { getAvailableJobs, getCompletedJobs } from "../controllers/jobs.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/jobs/available:
 *   get:
 *     tags: [Jobs]
 *     summary: Jobs disponibles para el técnico
 *     description: Retorna solicitudes pendientes dentro de 10km del técnico, ordenadas por urgencia y distancia.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         description: Latitud del técnico
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         description: Longitud del técnico
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filtrar por categoría (opcional)
 *     responses:
 *       200:
 *         description: Array de jobs disponibles
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es técnico
 */
router.get("/available", authenticate, requireRole("technician"), getAvailableJobs);

/**
 * @openapi
 * /api/jobs/completed:
 *   get:
 *     tags: [Jobs]
 *     summary: Jobs completados por el técnico
 *     description: Historial de trabajos completados con ganancias.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *         description: Fecha inicio (ISO-8601)
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *         description: Fecha fin (ISO-8601)
 *     responses:
 *       200:
 *         description: Array de jobs completados
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es técnico
 */
router.get("/completed", authenticate, requireRole("technician"), getCompletedJobs);

export default router;
