import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import multer from "multer";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = 3000;
app.use(express.json());

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY!,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
});

// API routes to transform diary
app.post("/api/convert-diary", async (req, res) => {
  const { diary } = req.body;
  try {
    const prompt = `Convert the following diary entry into the文体 of a 19th-century European villainess.
    Diary: ${diary}`;
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
    res.json({ story: result.text });
  } catch (error) {
    res.status(500).json({ error: "Failed to convert text" });
  }
});

// API route to generate manga
app.post("/api/generate-manga", upload.single('characterImage'), async (req, res) => {
    const { story } = req.body;
    const characterImage = req.file;

    try {
        const parts = [{
            text: `Generate a 5-7 panel manga-style illustration for the following villainess story. 
            Instruction: Use Japanese manga reading order (right-to-left). 
            Style: Masterpiece Japanese anime manga style, clean and uncluttered backgrounds. 
            Color palette: Pale, soft, and muted colors, creating a refined and intellectual atmosphere. 
            Character Profile: The villainess is a misunderstood tsundere who is thoughtful and acts for the sake of the people, but is often misjudged due to her personality. 
            The Manga should convey this personality, the story visually, and be intellectual and graceful.
            Story: ${story}`
        }];

        if (characterImage) {
            parts.push({
                inlineData: {
                    mimeType: characterImage.mimetype,
                    data: characterImage.buffer.toString('base64')
                }
            });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image',
            contents: { parts },
            config: {
                imageConfig: { aspectRatio: "3:4" },
            },
        });

        let imageUrl = '';
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                }
            }
        }
        res.json({ mangaUrl: imageUrl });
    } catch (error: any) {
        console.error("Manga generation error:", error);
        if (error?.status === 429 || error?.response?.status === 429 || error?.message?.includes('429')) {
             res.status(429).json({ error: "API quota exceeded. Please try again in about a minute." });
        } else {
            res.status(500).json({ error: "Failed to generate manga" });
        }
    }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
