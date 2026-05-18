import { Router } from "express";
import { createRequest, getMyRequests } from "../controllers/request.controller.js";
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

export default router;
