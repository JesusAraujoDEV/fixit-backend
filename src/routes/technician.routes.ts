import { Router } from "express";
import { getAvailability, updateAvailability, getProfile, updateProfile } from "../controllers/technician.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/technician/availability:
 *   get:
 *     tags: [Technician]
 *     summary: Obtener estado de disponibilidad
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
 */
router.get("/availability", authenticate, requireRole("technician"), getAvailability);

/**
 * @openapi
 * /api/technician/availability:
 *   patch:
 *     tags: [Technician]
 *     summary: Toggle disponibilidad del técnico
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
 *               lat: { type: number }
 *               lng: { type: number }
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.patch("/availability", authenticate, requireRole("technician"), updateAvailability);

/**
 * @openapi
 * /api/technician/profile:
 *   get:
 *     tags: [Technician]
 *     summary: Obtener perfil profesional
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil completo del técnico
 */
router.get("/profile", authenticate, requireRole("technician"), getProfile);

/**
 * @openapi
 * /api/technician/profile:
 *   put:
 *     tags: [Technician]
 *     summary: Actualizar perfil profesional
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bio: { type: string }
 *               full_name: { type: string }
 *               phone: { type: string }
 *               avatar_url: { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
router.put("/profile", authenticate, requireRole("technician"), updateProfile);

export default router;
