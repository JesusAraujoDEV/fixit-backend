import { Router } from "express";
import { getAvailableJobs, getCompletedJobs, getJobById, acceptJob } from "../controllers/jobs.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/jobs/available:
 *   get:
 *     tags: [Jobs]
 *     summary: Jobs disponibles para el técnico
 *     description: Retorna solicitudes pendientes dentro del radio, ordenadas por urgencia y distancia.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: max_distance
 *         schema: { type: number, default: 10 }
 *         description: Radio máximo en km (default 10)
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
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Array de jobs completados
 */
router.get("/completed", authenticate, requireRole("technician"), getCompletedJobs);

/**
 * @openapi
 * /api/jobs/{jobId}:
 *   get:
 *     tags: [Jobs]
 *     summary: Detalle completo de un job
 *     description: Retorna toda la info del servicio incluyendo imágenes, descripción, cliente y técnico.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Detalle del job
 *       404:
 *         description: No encontrado
 */
router.get("/:jobId", authenticate, getJobById);

/**
 * @openapi
 * /api/jobs/{jobId}/accept:
 *   post:
 *     tags: [Jobs]
 *     summary: Aceptar un job disponible
 *     description: El técnico acepta directamente un job sin esperar alerta de misión.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job aceptado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mission_id: { type: string }
 *                 job_id: { type: string }
 *                 status: { type: string, example: "accepted" }
 *                 title: { type: string }
 *                 category: { type: string }
 *                 latitude: { type: number }
 *                 longitude: { type: number }
 *       400:
 *         description: Job ya no disponible
 *       404:
 *         description: No encontrado
 *       409:
 *         description: Ya aceptado por otro técnico
 */
router.post("/:jobId/accept", authenticate, requireRole("technician"), acceptJob);

export default router;
