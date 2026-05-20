import { Router } from "express";
import { getAvailability, updateAvailability } from "../controllers/technician.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/technician/availability:
 *   get:
 *     tags: [Technician]
 *     summary: Obtener estado de disponibilidad
 *     description: Retorna si el técnico está online y cuándo se actualizó.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Estado actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 online: { type: boolean }
 *                 updated_at: { type: string, format: date-time }
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es técnico
 */
router.get("/availability", authenticate, requireRole("technician"), getAvailability);

/**
 * @openapi
 * /api/technician/availability:
 *   patch:
 *     tags: [Technician]
 *     summary: Toggle disponibilidad del técnico
 *     description: Cambia el estado online/offline del técnico y actualiza su ubicación.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [online]
 *             properties:
 *               online: { type: boolean }
 *               lat: { type: number, description: "Requerido si online=true" }
 *               lng: { type: number, description: "Requerido si online=true" }
 *     responses:
 *       200:
 *         description: Estado actualizado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 online: { type: boolean }
 *                 updated_at: { type: string, format: date-time }
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es técnico
 *       404:
 *         description: Perfil no encontrado
 */
router.patch("/availability", authenticate, requireRole("technician"), updateAvailability);

export default router;
