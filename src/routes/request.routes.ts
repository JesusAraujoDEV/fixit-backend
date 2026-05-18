import { Router } from "express";
import { createRequest } from "../controllers/request.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/requests:
 *   post:
 *     tags: [Requests]
 *     summary: Crear solicitud de servicio
 *     description: >
 *       Permite a un cliente crear un ticket de servicio con título, descripción,
 *       categoría, imágenes y ubicación geográfica.
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
 *               title:
 *                 type: string
 *                 minLength: 5
 *                 maxLength: 200
 *                 example: "Fuga de agua en cocina"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "Hay una fuga debajo del fregadero"
 *               category:
 *                 type: string
 *                 enum: [plumbing, electrical, carpentry, painting, appliance_repair, locksmith, cleaning, hvac, general]
 *               images:
 *                 type: array
 *                 maxItems: 4
 *                 items:
 *                   type: string
 *                   format: uri
 *               latitude:
 *                 type: number
 *                 minimum: -90
 *                 maximum: 90
 *               longitude:
 *                 type: number
 *                 minimum: -180
 *                 maximum: 180
 *     responses:
 *       201:
 *         description: Solicitud creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   example: "pending"
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 nearby_technicians_count:
 *                   type: integer
 *                 estimated_response_min:
 *                   type: integer
 *                   nullable: true
 *       400:
 *         description: Campos requeridos faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *       422:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 */
router.post("/", authenticate, requireRole("client"), createRequest);

export default router;
