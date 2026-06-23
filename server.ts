import dotenv from "dotenv";
import express from "express";
import { createServer as createViteServer } from "vite";
import convertDiary from "./api/convert-diary";
import generateManga from "./api/generate-manga";
import { JSON_LIMIT_BYTES } from "./lib/apiSafety";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.post("/api/convert-diary", express.json({ limit: JSON_LIMIT_BYTES }), convertDiary);
app.post("/api/generate-manga", generateManga);

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "spa",
});

app.use(vite.middlewares);

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
});
