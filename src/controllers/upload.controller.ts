import { Request, Response } from "express";
import FormData from "form-data";

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_API_URL = "https://api.imgbb.com/1/upload";

// ImgBB API response type
interface ImgBBResponse {
  success: boolean;
  data: {
    url: string;
    display_url: string;
    delete_url: string;
    title: string;
    size: number;
    width: number;
    height: number;
    expiration: number | null;
    thumb?: { url: string };
  };
  error?: { message: string };
}

/**
 * POST /api/upload/image
 * Receives an image file (multipart/form-data) from the frontend,
 * uploads it to ImgBB, and returns the hosted URL.
 *
 * The frontend uses the returned URL to include in the `images` array
 * when creating a service request.
 */
export async function uploadImage(req: Request, res: Response): Promise<void> {
  try {
    if (!IMGBB_API_KEY) {
      res.status(500).json({
        error: "IMGBB_API_KEY no configurada en el servidor",
        code: "internal_error",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: "Se requiere una imagen en el campo 'image'",
        code: "invalid_params",
      });
      return;
    }

    const file = req.file;

    // Validate file size (max 32MB as per ImgBB limits)
    if (file.size > 32 * 1024 * 1024) {
      res.status(422).json({
        error: "La imagen no debe superar 32MB",
        code: "invalid_file",
      });
      return;
    }

    // Validate file type
    const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp"];
    if (!allowedMimes.includes(file.mimetype)) {
      res.status(422).json({
        error: "Solo se permiten imágenes PNG, JPG, GIF o WebP",
        code: "invalid_file",
      });
      return;
    }

    // Convert buffer to base64 for ImgBB API
    const base64Image = file.buffer.toString("base64");

    // Build form data for ImgBB
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", base64Image);

    if (req.body.name) {
      formData.append("name", req.body.name);
    }

    // Optional expiration (in seconds)
    if (req.body.expiration) {
      formData.append("expiration", req.body.expiration);
    }

    // Upload to ImgBB
    const response = await fetch(IMGBB_API_URL, {
      method: "POST",
      body: formData as any,
    });

    const result = (await response.json()) as ImgBBResponse;

    if (!response.ok || !result.success) {
      console.error("ImgBB upload failed:", result);
      res.status(502).json({
        error: "Error al subir imagen al servicio externo",
        code: "upload_failed",
        details: result.error?.message || "Unknown error",
      });
      return;
    }

    // Return the relevant URLs to the frontend
    res.status(200).json({
      url: result.data.url,
      display_url: result.data.display_url,
      thumbnail_url: result.data.thumb?.url || result.data.display_url,
      delete_url: result.data.delete_url,
      size: result.data.size,
      width: result.data.width,
      height: result.data.height,
      title: result.data.title,
      expiration: result.data.expiration || null,
    });
  } catch (error) {
    console.error("UploadImage error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}

/**
 * POST /api/upload/image-url
 * Accepts an image URL and uploads it to ImgBB (useful for re-hosting).
 */
export async function uploadImageFromUrl(req: Request, res: Response): Promise<void> {
  try {
    if (!IMGBB_API_KEY) {
      res.status(500).json({
        error: "IMGBB_API_KEY no configurada en el servidor",
        code: "internal_error",
      });
      return;
    }

    const { image_url, name, expiration } = req.body;

    if (!image_url) {
      res.status(400).json({
        error: "Se requiere el campo 'image_url'",
        code: "invalid_params",
      });
      return;
    }

    // Build form data for ImgBB (passing URL directly)
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", image_url);

    if (name) formData.append("name", name);
    if (expiration) formData.append("expiration", String(expiration));

    const response = await fetch(IMGBB_API_URL, {
      method: "POST",
      body: formData as any,
    });

    const result = (await response.json()) as ImgBBResponse;

    if (!response.ok || !result.success) {
      console.error("ImgBB URL upload failed:", result);
      res.status(502).json({
        error: "Error al subir imagen desde URL",
        code: "upload_failed",
        details: result.error?.message || "Unknown error",
      });
      return;
    }

    res.status(200).json({
      url: result.data.url,
      display_url: result.data.display_url,
      thumbnail_url: result.data.thumb?.url || result.data.display_url,
      delete_url: result.data.delete_url,
      size: result.data.size,
      width: result.data.width,
      height: result.data.height,
      title: result.data.title,
      expiration: result.data.expiration || null,
    });
  } catch (error) {
    console.error("UploadImageFromUrl error:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      code: "internal_error",
    });
  }
}
