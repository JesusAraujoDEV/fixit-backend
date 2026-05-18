import { Request, Response } from "express";

/**
 * POST /api/ai/diagnose
 * Accepts an image upload and returns an AI-powered diagnosis.
 *
 * For now, this is a mock implementation that returns a simulated response.
 * In production, this would call an external AI service (OpenAI Vision, Google Cloud Vision, etc.)
 */
export async function diagnoseImage(req: Request, res: Response): Promise<void> {
  try {
    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({
        error: "Se requiere una imagen",
        code: "invalid_params",
      });
      return;
    }

    const file = req.file;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      res.status(422).json({
        error: "La imagen no debe superar 5MB",
        code: "invalid_file",
      });
      return;
    }

    // Validate file type
    const allowedMimes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedMimes.includes(file.mimetype)) {
      res.status(422).json({
        error: "Solo se permiten imágenes PNG o JPG",
        code: "invalid_file",
      });
      return;
    }

    // Mock AI diagnosis response
    // TODO: Replace with actual AI service call (OpenAI Vision, etc.)
    const mockDiagnoses = [
      {
        diagnosis: "Posible cortocircuito en el panel eléctrico. Se observan marcas de quemadura en los conectores.",
        confidence: 0.87,
        suggested_category: "electrical" as const,
        tags: ["cortocircuito", "panel eléctrico", "quemadura", "urgente"],
      },
      {
        diagnosis: "Fuga de agua visible en la conexión de la tubería. Posible desgaste del sello de goma.",
        confidence: 0.92,
        suggested_category: "plumbing" as const,
        tags: ["fuga", "tubería", "sello", "conexión"],
      },
      {
        diagnosis: "Compresor del aire acondicionado con ruido anormal. Posible falla en el motor del ventilador.",
        confidence: 0.75,
        suggested_category: "hvac" as const,
        tags: ["aire acondicionado", "compresor", "ruido", "ventilador"],
      },
      {
        diagnosis: "Cerradura dañada con signos de forzamiento. Se recomienda reemplazo completo del cilindro.",
        confidence: 0.81,
        suggested_category: "locksmith" as const,
        tags: ["cerradura", "forzamiento", "cilindro", "seguridad"],
      },
    ];

    // Pick a random diagnosis for the mock
    const diagnosis = mockDiagnoses[Math.floor(Math.random() * mockDiagnoses.length)];

    res.status(200).json(diagnosis);
  } catch (error) {
    console.error("DiagnoseImage error:", error);
    res.status(500).json({ error: "Error interno del servidor", code: "internal_error" });
  }
}
