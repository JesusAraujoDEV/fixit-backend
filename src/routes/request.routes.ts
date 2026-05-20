import { Router } from "express";
import { createRequest, getMyRequests, completeRequest, rateRequest, rateClient } from "../controllers/request.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/requests:
 *   post:
 *     tags: [Requests]
 *     summary: Crear solicitud de servicio
 *     description: Permite a un cliente crear un ticket con título, categoría, imágenes y ubicación.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, category, latitude, longitude]
 *             properties:
 *               title: { type: string, minLength: 5, maxLength: 200 }
 *               description: { type: string }
 *               category: { type: string, enum: [plumbing, electrical, carpentry, painting, appliance_repair, locksmith, cleaning, hvac, general] }
 *               images: { type: array, items: { type: string }, maxItems: 4 }
 *               latitude: { type: number }
 *               longitude: { type: number }
 *     responses:
 *       201:
 *         description: Solicitud creada
 *       400:
 *         description: Campos faltantes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es cliente
 *       422:
 *         description: Error de validación
 */
router.post("/", authenticate, requireRole("client"), createRequest);

/**
 * @openapi
 * /api/requests/mine:
 *   get:
 *     tags: [Requests]
 *     summary: Historial de solicitudes del cliente
 *     description: Retorna las solicitudes del cliente autenticado, opcionalmente filtradas por estado.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, completed, cancelled] }
 *         description: Filtrar por estado
 *     responses:
 *       200:
 *         description: Array de solicitudes
 *       401:
 *         description: No autenticado
 */
router.get("/mine", authenticate, requireRole("client"), getMyRequests);

/**
 * @openapi
 * /api/requests/{id}/complete:
 *   post:
 *     tags: [Requests]
 *     summary: Marcar solicitud como completada
 *     description: El cliente marca un servicio en progreso como completado.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Solicitud completada
 *       400:
 *         description: No está en progreso
 *       403:
 *         description: No es el dueño
 *       404:
 *         description: No encontrada
 */
router.post("/:id/complete", authenticate, requireRole("client"), completeRequest);

/**
 * @openapi
 * /api/requests/{id}/rate:
 *   post:
 *     tags: [Requests]
 *     summary: Cliente califica al técnico
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Reseña creada
 *       400:
 *         description: Servicio no completado
 *       409:
 *         description: Ya calificado
 */
router.post("/:id/rate", authenticate, requireRole("client"), rateRequest);

/**
 * @openapi
 * /api/requests/{id}/rate-client:
 *   post:
 *     tags: [Requests]
 *     summary: Técnico califica al cliente
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string }
 *     responses:
 *       201:
 *         description: Reseña creada
 *       400:
 *         description: Servicio no completado
 *       409:
 *         description: Ya calificado
 */
router.post("/:id/rate-client", authenticate, requireRole("technician"), rateClient);

export default router;
