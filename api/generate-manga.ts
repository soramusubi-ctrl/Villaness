import { GoogleGenAI } from "@google/genai";
import multer from "multer";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_BYTES,
  STORY_MAX_CHARS,
  getClientIp,
  isRateLimited,
  sendError,
} from "../lib/apiSafety";

export const config = {
  api: {
    bodyParser: false,
  },
};

const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

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

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), { statusCode: 500 });
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { "User-Agent": "villainess-diary-vercel" } },
  });
}

function runUpload(req: any, res: any) {
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
        text: `Generate a 5-7 panel manga-style illustration for the following villainess story.
Instruction: Use Japanese manga reading order (right-to-left).
Style: Masterpiece Japanese anime manga style, clean and uncluttered backgrounds.
Color palette: Pale, soft, and muted colors, creating a refined and intellectual atmosphere.
Character Profile: The villainess is a misunderstood tsundere who is thoughtful and acts for the sake of the people, but is often misjudged due to her personality.
The manga should convey this personality, the story visually, and be intellectual and graceful.
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

    const response = await getClient().models.generateContent({
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
