import { Router } from "express";
import { getTechnicians, getRequestMarkers, getHeatmap } from "../controllers/map.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/map/technicians:
 *   get:
 *     tags: [Map]
 *     summary: Obtener técnicos cercanos
 *     description: Consulta espacial Haversine para retornar técnicos online dentro del radio.
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
 *         name: radius_km
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Lista de técnicos
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autenticado
 */
router.get("/technicians", authenticate, getTechnicians);

/**
 * @openapi
 * /api/map/requests:
 *   get:
 *     tags: [Map]
 *     summary: Obtener markers de solicitudes
 *     description: Retorna solicitudes pendientes dentro del radio para pintar en el mapa.
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
 *         name: radius_km
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Array de markers de solicitudes
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autenticado
 */
router.get("/requests", authenticate, requireRole("client"), getRequestMarkers);

/**
 * @openapi
 * /api/map/heatmap:
 *   get:
 *     tags: [Map]
 *     summary: Obtener zonas de demanda (heatmap)
 *     description: Retorna zonas de calor basadas en densidad de solicitudes.
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
 *         name: radius_km
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Array de zonas de calor
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autenticado
 */
router.get("/heatmap", authenticate, requireRole("technician", "admin"), getHeatmap);

export default router;
