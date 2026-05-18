import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User, TechnicianProfile } from "../models/index.js";
import { signToken } from "../middleware/auth.middleware.js";
import { USER_ROLES, type UserRole } from "../models/user.model.js";

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Creates a new user account and returns JWT + user object.
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, full_name, phone, role } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      res.status(400).json({
        error: "email, password, full_name y role son requeridos",
        code: "invalid_params",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(422).json({
        error: "Formato de email inválido",
        code: "invalid_params",
        errors: [{ field: "email", message: "Email no válido" }],
      });
      return;
    }

    // Validate password length
    if (password.length < 6) {
      res.status(422).json({
        error: "La contraseña debe tener al menos 6 caracteres",
        code: "invalid_params",
        errors: [{ field: "password", message: "Mínimo 6 caracteres" }],
      });
      return;
    }

    // Validate role (only client and technician can self-register)
    const allowedRoles: UserRole[] = ["client", "technician"];
    if (!allowedRoles.includes(role)) {
      res.status(422).json({
        error: "El rol debe ser 'client' o 'technician'",
        code: "invalid_params",
        errors: [{ field: "role", message: "Rol no válido. Solo client o technician" }],
      });
      return;
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        error: "Ya existe una cuenta con este email",
        code: "email_taken",
      });
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email,
      password_hash,
      full_name,
      phone: phone || null,
      role: role as UserRole,
    });

    // If technician, create their profile automatically
    if (role === "technician") {
      await TechnicianProfile.create({
        user_id: user.id,
        is_online: false,
        is_verified: false,
        rating_average: 0,
      });
    }

    // Sign JWT
    const token = signToken({ id: user.id, role: user.role });

    res.status(201).json({
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
    console.error("Register error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}

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
