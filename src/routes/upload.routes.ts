import { Router } from "express";
import multer from "multer";
import { uploadImage, uploadImageFromUrl } from "../controllers/upload.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

// Multer config: memory storage, max 32MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 32 * 1024 * 1024 },
});

const router = Router();

/**
 * @openapi
 * /api/upload/image:
 *   post:
 *     tags: [Upload]
 *     summary: Subir imagen a ImgBB
 *     description: >
 *       Recibe un archivo de imagen (multipart/form-data), lo sube a ImgBB
 *       y retorna la URL pública. El frontend usa esta URL para incluirla
 *       en el array `images` al crear un ticket de servicio.
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
 *                 description: Archivo de imagen (PNG, JPG, GIF, WebP — máx 32MB)
 *               name:
 *                 type: string
 *                 description: Nombre personalizado para la imagen (opcional)
 *               expiration:
 *                 type: integer
 *                 description: Tiempo de expiración en segundos (60–15552000, opcional)
 *     responses:
 *       200:
 *         description: Imagen subida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: URL directa de la imagen
 *                   example: "https://i.ibb.co/abc123/image.png"
 *                 display_url:
 *                   type: string
 *                   description: URL para mostrar
 *                 thumbnail_url:
 *                   type: string
 *                   description: URL del thumbnail
 *                 delete_url:
 *                   type: string
 *                   description: URL para eliminar la imagen
 *                 size:
 *                   type: integer
 *                   description: Tamaño en bytes
 *                 width:
 *                   type: integer
 *                 height:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 expiration:
 *                   type: integer
 *                   nullable: true
 *       400:
 *         description: No se envió imagen
 *       401:
 *         description: No autenticado
 *       422:
 *         description: Archivo inválido (tamaño o formato)
 *       502:
 *         description: Error del servicio externo (ImgBB)
 */
router.post("/image", authenticate, upload.single("image"), uploadImage);

/**
 * @openapi
 * /api/upload/image-url:
 *   post:
 *     tags: [Upload]
 *     summary: Subir imagen desde URL a ImgBB
 *     description: >
 *       Recibe una URL de imagen, la sube a ImgBB para re-hosting
 *       y retorna la nueva URL permanente.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [image_url]
 *             properties:
 *               image_url:
 *                 type: string
 *                 format: uri
 *                 description: URL de la imagen a subir
 *                 example: "https://example.com/photo.jpg"
 *               name:
 *                 type: string
 *                 description: Nombre personalizado (opcional)
 *               expiration:
 *                 type: integer
 *                 description: Expiración en segundos (opcional)
 *     responses:
 *       200:
 *         description: Imagen subida exitosamente
 *       400:
 *         description: Falta image_url
 *       401:
 *         description: No autenticado
 *       502:
 *         description: Error del servicio externo
 */
router.post("/image-url", authenticate, uploadImageFromUrl);

export default router;
