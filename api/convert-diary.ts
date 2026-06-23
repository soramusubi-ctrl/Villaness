const WINDOW_MS = 60_000;
const JSON_LIMIT_BYTES = 16 * 1024;
const DIARY_MAX_CHARS = 4_000;
const textModel = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";
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

async function readJsonBody(req: any, maxBytes = JSON_LIMIT_BYTES) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > maxBytes) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    return JSON.parse(req.body);
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw Object.assign(new Error("Request body too large"), { statusCode: 413 });
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
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

    const prompt = `Convert the following diary entry into the voice of a 19th-century European noblewoman who is called a villainess, but is not actually evil.
She should sound elegant, proud, sharp-tongued, and a little tsundere, yet fundamentally kind, thoughtful, and acting with good intentions.
Avoid making her cruel, malicious, manipulative, or genuinely villainous. Make her feel misunderstood rather than wicked.
Diary: ${diary}`;

    const ai = await getClient();
    const result = await ai.models.generateContent({
      model: textModel,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.status(200).json({ story: result.text || "" });
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status || error?.response?.status || 500;
    if (error?.message === "GEMINI_API_KEY is not configured.") {
      return sendError(res, 500, error.message);
    }
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
