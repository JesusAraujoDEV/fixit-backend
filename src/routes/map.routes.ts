import { Router } from "express";
import { getTechnicians } from "../controllers/map.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/map/technicians:
 *   get:
 *     tags: [Map]
 *     summary: Obtener técnicos cercanos
 *     description: >
 *       Realiza una consulta espacial PostGIS para retornar técnicos online
 *       dentro del radio especificado. Usa ST_DWithin con geography para
 *       cálculos precisos de distancia en metros.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitud del punto central
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitud del punto central
 *       - in: query
 *         name: radius_km
 *         required: true
 *         schema:
 *           type: number
 *           minimum: 0.1
 *           maximum: 100
 *         description: Radio de búsqueda en kilómetros
 *     responses:
 *       200:
 *         description: Lista de técnicos dentro del radio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 technicians:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TechnicianMarker'
 *       400:
 *         description: Parámetros inválidos o faltantes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: No autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/technicians", authenticate, getTechnicians);

export default router;
