export const config = {
  api: {
    bodyParser: false,
  },
};

const WINDOW_MS = 60_000;
const STORY_MAX_CHARS = 8_000;
const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return firstForwarded?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function isRateLimited(key: string, limit: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

function sendError(res: any, statusCode: number, error: string) {
  res.status(statusCode).json({ error });
}

async function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured."), { statusCode: 500 });
  }

  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { "User-Agent": "villainess-diary-vercel" } },
  });
}

async function runUpload(req: any, res: any) {
  const { default: multer } = await import("multer");
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: IMAGE_MAX_BYTES,
      files: 1,
      fields: 1,
      fieldSize: STORY_MAX_CHARS * 4,
    },
    fileFilter: (_req, file, callback) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return callback(new Error("Unsupported image type"));
      }
      callback(null, true);
    },
  }).single("characterImage");

  return new Promise<void>((resolve, reject) => {
    upload(req, res, (error: unknown) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Method not allowed");
  }

  const ip = getClientIp(req);
  if (isRateLimited(`manga:${ip}`, 6)) {
    return sendError(res, 429, "Too many requests. Please try again later.");
  }

  try {
    await runUpload(req, res);

    const story = req.body?.story;
    if (typeof story !== "string" || story.trim().length === 0) {
      return sendError(res, 400, "Story text is required.");
    }

    if (story.length > STORY_MAX_CHARS) {
      return sendError(res, 413, `Story text must be ${STORY_MAX_CHARS} characters or fewer.`);
    }

    const characterImage = req.file;
    const parts: any[] = [
      {
        text: `Generate a 5-7 panel manga-style illustration for the following misunderstood villainess-style story.
Instruction: Use Japanese manga reading order (right-to-left).
Style: Masterpiece Japanese anime manga style, clean and uncluttered backgrounds.
Color palette: Pale, soft, and muted colors, creating a refined and intellectual atmosphere.
Character Profile: She has the aura, fashion, and sharp expression of a villainess, but she is not evil. She is a misunderstood tsundere noblewoman who is thoughtful, protective, and acting for the sake of others, while being misjudged because her words sound proud or severe.
Avoid depicting her as cruel, malicious, sadistic, or genuinely villainous. The manga should convey grace, intelligence, hidden kindness, and the gap between her intimidating appearance and good intentions.
Story: ${story}`,
      },
    ];

    if (characterImage) {
      parts.push({
        inlineData: {
          mimeType: characterImage.mimetype,
          data: characterImage.buffer.toString("base64"),
        },
      });
    }

    const ai = await getClient();
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: { parts },
      config: {
        imageConfig: { aspectRatio: "3:4" },
        responseModalities: ["Image"],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
      return sendError(res, 502, "Gemini did not return an image.");
    }

    res.status(200).json({
      mangaUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
    });
  } catch (error: any) {
    if (error?.message === "GEMINI_API_KEY is not configured.") {
      return sendError(res, 500, error.message);
    }
    if (error?.code === "LIMIT_FILE_SIZE") {
      return sendError(res, 413, "Image must be 4 MB or smaller.");
    }
    if (error?.message === "Unsupported image type") {
      return sendError(res, 415, "Only JPEG, PNG, and WebP images are supported.");
    }
    if (error?.status === 429 || error?.response?.status === 429 || error?.message?.includes("429")) {
      return sendError(res, 429, "API quota exceeded. Please try again later.");
    }

    console.error("Manga generation error:", error);
    sendError(res, 500, "Failed to generate manga.");
  }
}
