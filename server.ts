import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body parser with high limit since we are sending base64 files
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Initialize Gemini client using @google/genai
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for analyzing artwork
  app.post("/api/analyze-artwork", async (req, res) => {
    try {
      const { fileName, mimeType, base64Data } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: "Missing base64Data of the file" });
      }

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing. Falling back to mock parsing.");
        return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not set on the server." });
      }

      console.log(`Analyzing file: ${fileName} (${mimeType}) with Gemini 3.5 Flash...`);

      const filePart = {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data,
        },
      };

      const prompt = `Analyze this medical device / medical accessory artwork or packaging layout file (usually a PDF, PNG, or JPEG layout for Sansico Medica).
Please extract the following information accurately from the text or visual contents of the document:
1. Product/Project Name (e.g. "Sansico Infusion Bag 500ml", "Sansico Syringe Set 10ml")
2. Document Type (Must be exactly one of: "Inner Box", "Label Botol", "IFU", "QC Pass Certif")
3. Product Code / REF code (Must extract the actual REF / reference number, printed on the design. Maintain prefix 'REF' if present, e.g. "REF-SYN-10ML" or "REF 1002301")
4. NIE Number / Nomor Izin Edar (Indonesian Kemenkes registration number printed on the design, e.g. "KEMENKES RI AKD 20101221725", "KEMENKES RI AKL 20902511032", "KEMENKES RI PKRT 20501110092", or "AKD 20902120034"). 
   - Search the document text carefully for any occurrences of "KEMENKES", "AKD", "AKL", "PKRT", "NIE", or "Izin Edar".
   - Extract the EXACT registration code printed on the artwork.
   - If no NIE / AKD / AKL / PKRT registration number is printed anywhere on the document, return an empty string "". DO NOT fabricate or invent a fake NIE number.
5. All legible artwork text content printed on the layout.

Search the text carefully for any registration code resembling Indonesian Kemenkes AKD/AKL/PKRT formats or standard REF codes, and output it.
Ensure the output matches the exact text on the document.`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: [filePart, prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Extracted name of the medical device product." },
              docType: { type: Type.STRING, description: "Document type. Must be exactly 'Inner Box', 'Label Botol', 'IFU', or 'QC Pass Certif'." },
              refCode: { type: Type.STRING, description: "The product's REF code / reference number." },
              nieNumber: { type: Type.STRING, description: "The Indonesian KEMENKES RI AKD/AKL/PKRT registration number." },
              artworkText: { type: Type.STRING, description: "All legible text content found on the artwork design." }
            },
            required: ["name", "docType", "refCode", "nieNumber", "artworkText"]
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("Analysis successful:", text);
      res.json(JSON.parse(text));
    } catch (error: any) {
      console.error("Error analyzing artwork with Gemini:", error);
      res.status(500).json({ error: error.message || "Failed to analyze artwork with Gemini API" });
    }
  });

  // Serve static files in production / Vite middleware in dev
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
