import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/index.js";
import { signToken } from "../middleware/auth.middleware.js";

/**
 * POST /api/auth/login
 * Validates credentials, returns JWT + user object.
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        error: "Email y contraseña son requeridos",
        code: "invalid_params",
      });
      return;
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(401).json({
        error: "Credenciales inválidas",
        code: "unauthorized",
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      res.status(401).json({
        error: "Credenciales inválidas",
        code: "unauthorized",
      });
      return;
    }

    const token = signToken({ id: user.id, role: user.role });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}

/**
 * GET /api/auth/me
 * Returns the authenticated user's data (requires JWT).
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password_hash"] },
    });

    if (!user) {
      res.status(404).json({
        error: "Usuario no encontrado",
        code: "not_found",
      });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone: user.phone,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}
