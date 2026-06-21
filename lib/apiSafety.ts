const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

export const JSON_LIMIT_BYTES = 16 * 1024;
export const DIARY_MAX_CHARS = 4_000;
export const STORY_MAX_CHARS = 8_000;
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function getClientIp(req: { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
  const forwardedFor = req.headers?.["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return firstForwarded?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

export function isRateLimited(key: string, limit: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

export async function readJsonBody(req: any, maxBytes = JSON_LIMIT_BYTES) {
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

export function sendError(res: any, statusCode: number, error: string) {
  res.status(statusCode).json({ error });
}
