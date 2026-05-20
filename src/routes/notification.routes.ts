import { Router } from "express";
import { getNotifications } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Obtener notificaciones del usuario
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: Array de notificaciones
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   type: { type: string, enum: [info, success, warning, error] }
 *                   title: { type: string }
 *                   message: { type: string }
 *                   read: { type: boolean }
 *                   created_at: { type: string, format: date-time }
 */
router.get("/", authenticate, getNotifications);

export default router;
