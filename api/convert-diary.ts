import { GoogleGenAI } from "@google/genai";
import {
  DIARY_MAX_CHARS,
  getClientIp,
  isRateLimited,
  readJsonBody,
  sendError,
} from "../lib/apiSafety";

const textModel = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(new Error("GEMINI_API_KEY is not configured"), { statusCode: 500 });
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { "User-Agent": "villainess-diary-vercel" } },
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendError(res, 405, "Method not allowed");
  }

  const ip = getClientIp(req);
  if (isRateLimited(`convert:${ip}`, 20)) {
    return sendError(res, 429, "Too many requests. Please try again later.");
  }

  try {
    const { diary } = await readJsonBody(req);

    if (typeof diary !== "string" || diary.trim().length === 0) {
      return sendError(res, 400, "Diary text is required.");
    }

    if (diary.length > DIARY_MAX_CHARS) {
      return sendError(res, 413, `Diary text must be ${DIARY_MAX_CHARS} characters or fewer.`);
    }

    const prompt = `Convert the following diary entry into the voice of a 19th-century European villainess.
Diary: ${diary}`;

    const result = await getClient().models.generateContent({
      model: textModel,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.status(200).json({ story: result.text || "" });
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status || error?.response?.status || 500;
    if (statusCode === 413) {
      return sendError(res, 413, "Request body too large.");
    }
    if (statusCode === 429 || error?.message?.includes("429")) {
      return sendError(res, 429, "API quota exceeded. Please try again later.");
    }

    console.error("Diary conversion error:", error);
    sendError(res, 500, "Failed to convert text.");
  }
}
