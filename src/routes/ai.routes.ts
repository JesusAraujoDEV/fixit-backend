import { Router } from "express";
import multer from "multer";
import { diagnoseImage } from "../controllers/ai.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

// Configure multer for memory storage (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo se permiten imágenes PNG o JPG"));
    }
  },
});

const router = Router();

/**
 * @openapi
 * /api/ai/diagnose:
 *   post:
 *     tags: [AI]
 *     summary: Diagnóstico por imagen con IA
 *     description: Sube una foto y recibe un diagnóstico automático con categoría sugerida.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Imagen PNG o JPG (máx 5MB)
 *     responses:
 *       200:
 *         description: Diagnóstico exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 diagnosis: { type: string }
 *                 confidence: { type: number, minimum: 0, maximum: 1 }
 *                 suggested_category: { type: string }
 *                 tags: { type: array, items: { type: string } }
 *       400:
 *         description: No se envió imagen
 *       401:
 *         description: No autenticado
 *       422:
 *         description: Archivo inválido (tamaño o formato)
 */
router.post("/diagnose", authenticate, requireRole("client"), upload.single("image"), diagnoseImage);

export default router;
