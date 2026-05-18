import { Request, Response } from "express";
import { Op } from "sequelize";
import {
  sequelize,
  Transaction,
  ServiceRequest,
  User,
  TechnicianProfile,
  PlatformEvent,
  TechnicianVerification,
} from "../models/index.js";
import { QueryTypes } from "sequelize";

/**
 * GET /api/admin/transactions
 * List transactions with pagination and optional filters.
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const per_page = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 20));
    const status = req.query.status as string | undefined;
    const date_from = req.query.date_from as string | undefined;
    const date_to = req.query.date_to as string | undefined;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (date_from || date_to) {
      const dateFilter: Record<string, unknown> = {};
      if (date_from) dateFilter[Op.gte as unknown as string] = new Date(date_from);
      if (date_to) dateFilter[Op.lte as unknown as string] = new Date(date_to);
      where.created_at = dateFilter;
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [
        {
          model: ServiceRequest,
          as: "serviceRequest",
          attributes: ["title", "client_id", "technician_id"],
          include: [
            { model: User, as: "client", attributes: ["full_name"] },
            { model: User, as: "technician", attributes: ["full_name"] },
          ],
        },
      ],
      order: [["created_at", "DESC"]],
      limit: per_page,
      offset: (page - 1) * per_page,
    });

    const data = rows.map((t) => {
      const sr = (t as any).serviceRequest;
      return {
        id: t.id,
        client: sr?.client?.full_name || "N/A",
        technician: sr?.technician?.full_name || "N/A",
        service: sr?.title || "N/A",
        amount: `$${t.amount}`,
        commission: `$${t.commission_amount}`,
        status: t.status,
        created_at: t.created_at,
      };
    });

    res.status(200).json({
      data,
      total: count,
      page,
      per_page,
    });
  } catch (error) {
    console.error("GetTransactions error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/admin/transactions/summary
 * Get today's transaction summary.
 */
export async function getTransactionSummary(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [result] = await sequelize.query<{
      today_count: string;
      today_volume: string;
      today_commission: string;
    }>(
      `
      SELECT
        COUNT(*)::integer AS today_count,
        COALESCE(SUM(amount), 0) AS today_volume,
        COALESCE(SUM(commission_amount), 0) AS today_commission
      FROM fixit.transactions
      WHERE created_at >= :today
      `,
      {
        replacements: { today: today.toISOString() },
        type: QueryTypes.SELECT,
      }
    );

    const disputes = await Transaction.count({
      where: { status: "pending" },
    });

    res.status(200).json({
      today_count: parseInt(result?.today_count || "0"),
      today_volume: `$${parseFloat(result?.today_volume || "0").toFixed(2)}`,
      today_commission: `$${parseFloat(result?.today_commission || "0").toFixed(2)}`,
      disputes_pending: disputes,
    });
  } catch (error) {
    console.error("GetTransactionSummary error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/admin/verifications
 * List technician verifications, optionally filtered by status.
 */
export async function getVerifications(req: Request, res: Response): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    const verifications = await TechnicianVerification.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["full_name"] },
      ],
      order: [["created_at", "DESC"]],
    });

    const response = verifications.map((v) => ({
      id: v.id,
      name: (v as any).user?.full_name || "N/A",
      specialty: v.specialty,
      experience: v.experience,
      documents_count: v.documents_count,
      status: v.status,
      submitted_at: v.created_at,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetVerifications error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * PATCH /api/admin/verifications/:id
 * Approve or reject a technician verification.
 */
export async function updateVerification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({
        error: "action debe ser 'approve' o 'reject'",
        code: "invalid_params",
      });
      return;
    }

    if (action === "reject" && !reason) {
      res.status(400).json({
        error: "reason es requerido cuando action='reject'",
        code: "invalid_params",
      });
      return;
    }

    const verification = await TechnicianVerification.findByPk(id as string);

    if (!verification) {
      res.status(404).json({
        error: "Verificación no encontrada",
        code: "not_found",
      });
      return;
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    await verification.update({
      status: newStatus as any,
      rejection_reason: action === "reject" ? reason : null,
      reviewed_at: new Date(),
    });

    // If approved, update the technician profile
    if (action === "approve") {
      await TechnicianProfile.update(
        { is_verified: true },
        { where: { user_id: verification.user_id } }
      );

      // Log event
      await PlatformEvent.create({
        type: "success",
        message: `Técnico verificado: ${verification.user_id}`,
        metadata: { verification_id: id },
      });
    } else {
      await PlatformEvent.create({
        type: "warning",
        message: `Verificación rechazada: ${verification.user_id} — ${reason}`,
        metadata: { verification_id: id },
      });
    }

    res.status(200).json({
      id: verification.id,
      status: verification.status,
      reviewed_at: verification.reviewed_at,
    });
  } catch (error) {
    console.error("UpdateVerification error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/admin/events
 * Get recent platform events (activity log).
 */
export async function getEvents(req: Request, res: Response): Promise<void> {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const type = req.query.type as string | undefined;

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }

    const events = await PlatformEvent.findAll({
      where,
      order: [["created_at", "DESC"]],
      limit,
    });

    const response = events.map((e) => ({
      id: e.id,
      time: e.created_at,
      type: e.type,
      message: e.message,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("GetEvents error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/admin/kpis
 * Get KPI dashboard metrics.
 */
export async function getKPIs(req: Request, res: Response): Promise<void> {
  try {
    const activeServices = await ServiceRequest.count({
      where: { status: ["pending", "searching", "matched", "in_progress"] as any },
    });

    const techniciansOnline = await TechnicianProfile.count({
      where: { is_online: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [revenueResult] = await sequelize.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM fixit.transactions WHERE created_at >= :today`,
      { replacements: { today: today.toISOString() }, type: QueryTypes.SELECT }
    );

    const reportsPending = await TechnicianVerification.count({
      where: { status: "pending" },
    });

    // Calculate deltas (simplified — compare with yesterday)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayServices = await ServiceRequest.count({
      where: {
        status: ["pending", "searching", "matched", "in_progress"] as any,
        created_at: { [Op.lt as unknown as string]: today, [Op.gte as unknown as string]: yesterday },
      },
    });

    const serviceDelta = activeServices - yesterdayServices;

    res.status(200).json({
      active_services: {
        value: activeServices,
        delta: `${serviceDelta >= 0 ? "+" : ""}${serviceDelta}`,
      },
      technicians_online: {
        value: techniciansOnline,
        delta: "+0", // TODO: compare with previous period
      },
      revenue_today: {
        value: `$${parseFloat(revenueResult?.total || "0").toFixed(2)}`,
        delta: "+0%",
      },
      reports_pending: {
        value: reportsPending,
        delta: "0",
      },
    });
  } catch (error) {
    console.error("GetKPIs error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}

/**
 * GET /api/admin/performance/weekly
 * Get weekly performance data (last 7 days of completed services).
 */
export async function getWeeklyPerformance(req: Request, res: Response): Promise<void> {
  try {
    const days: { label: string; completed: number; date: string }[] = [];
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await ServiceRequest.count({
        where: {
          status: "completed",
          updated_at: {
            [Op.gte as unknown as string]: date,
            [Op.lt as unknown as string]: nextDay,
          },
        },
      });

      days.push({
        label: dayNames[date.getDay()],
        completed: count,
        date: date.toISOString().split("T")[0],
      });
    }

    res.status(200).json({ days });
  } catch (error) {
    console.error("GetWeeklyPerformance error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
