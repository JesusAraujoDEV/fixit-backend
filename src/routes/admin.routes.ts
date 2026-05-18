import { Router } from "express";
import {
  getTransactions,
  getTransactionSummary,
  getVerifications,
  updateVerification,
  getEvents,
  getKPIs,
  getWeeklyPerformance,
} from "../controllers/admin.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /api/admin/transactions:
 *   get:
 *     tags: [Admin]
 *     summary: Listar transacciones
 *     description: Retorna transacciones con paginación y filtros opcionales.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: per_page
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, paid, refunded] }
 *       - in: query
 *         name: date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: date_to
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Transacciones paginadas
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No es admin
 */
router.get("/transactions", authenticate, requireRole("admin"), getTransactions);

/**
 * @openapi
 * /api/admin/transactions/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Resumen de transacciones del día
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen con totales del día
 */
router.get("/transactions/summary", authenticate, requireRole("admin"), getTransactionSummary);

/**
 * @openapi
 * /api/admin/verifications:
 *   get:
 *     tags: [Admin]
 *     summary: Listar verificaciones de técnicos
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *     responses:
 *       200:
 *         description: Array de verificaciones
 */
router.get("/verifications", authenticate, requireRole("admin"), getVerifications);

/**
 * @openapi
 * /api/admin/verifications/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: Aprobar o rechazar verificación
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
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject] }
 *               reason: { type: string, description: "Requerido si action='reject'" }
 *     responses:
 *       200:
 *         description: Verificación actualizada
 *       400:
 *         description: Parámetros inválidos
 *       404:
 *         description: Verificación no encontrada
 */
router.patch("/verifications/:id", authenticate, requireRole("admin"), updateVerification);

/**
 * @openapi
 * /api/admin/events:
 *   get:
 *     tags: [Admin]
 *     summary: Log de eventos de la plataforma
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [info, success, warning, error] }
 *     responses:
 *       200:
 *         description: Array de eventos ordenados por fecha descendente
 */
router.get("/events", authenticate, requireRole("admin"), getEvents);

/**
 * @openapi
 * /api/admin/kpis:
 *   get:
 *     tags: [Admin]
 *     summary: KPIs del dashboard
 *     description: Métricas clave con deltas comparativos.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Objeto con active_services, technicians_online, revenue_today, reports_pending
 */
router.get("/kpis", authenticate, requireRole("admin"), getKPIs);

/**
 * @openapi
 * /api/admin/performance/weekly:
 *   get:
 *     tags: [Admin]
 *     summary: Performance semanal
 *     description: Servicios completados por día en los últimos 7 días.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array de 7 días con label, completed y date
 */
router.get("/performance/weekly", authenticate, requireRole("admin"), getWeeklyPerformance);

export default router;
