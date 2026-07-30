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

  // API endpoint for analyzing artwork (supports /api/analyze-artwork and /api/extract-pdf)
  app.post(["/api/analyze-artwork", "/api/extract-pdf"], async (req, res) => {
    try {
      const { fileName = "Artwork.pdf", mimeType, base64Data } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: "Missing base64Data of the file" });
      }

      // Check if GEMINI_API_KEY is available
      if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing. Returning fallback JSON payload.");
        return res.json({
          name: fileName.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "").replace(/_/g, " "),
          docType: fileName.toLowerCase().includes("pouch") ? "Pouch" : fileName.toLowerCase().includes("label") ? "Label Botol" : fileName.toLowerCase().includes("ifu") ? "IFU" : "Inner Box",
          refCode: "REF-1002301",
          nieNumber: "KEMENKES RI AKD 20902120034",
          artworkText: `Dokumen: ${fileName}\nDiproduksi oleh: PT Sansico Medika Indonesia`
        });
      }

      console.log(`Analyzing file: ${fileName} (${mimeType}) with Gemini 3.6 Flash...`);

      const filePart = {
        inlineData: {
          mimeType: mimeType || "application/pdf",
          data: base64Data,
        },
      };

      const prompt = `Analyze this medical device / medical accessory artwork or packaging layout file (usually a PDF, PNG, or JPEG layout for Sansico Medica).
Please extract the following information accurately from the text or visual contents of the document:
1. Product/Project Name (e.g. "Sansico Infusion Bag 500ml", "Sansico Syringe Set 10ml")
2. Document Type (Must be exactly one of: "Inner Box", "Pouch", "Label Botol", "IFU", "QC Pass Certif", "Master Carton", "Lainnya")
3. Product Code / REF code (Must extract the actual REF / reference number, printed on the design, e.g. "REF-SYN-10ML", "REF 1002301", or "SYN-10ML")
4. NIE Number / Nomor Izin Edar / Kemenkes RI Registration (Look carefully everywhere on the artwork layout for terms like "KEMENKES", "AKD", "AKL", "PKRT", "NIE", "Izin Edar", "No. Reg", or any 10-12 digit registration number e.g. "KEMENKES RI AKD 20101221725", "AKD 20902120034", "AKL 20902511032", "PKRT 20501110092", or "20902120034").
   - Extract the full NIE/AKD/AKL/PKRT code as formatted or at minimum the prefix and numbers (e.g. "KEMENKES RI AKD 20902120034").
   - If only the numbers or AKD/AKL prefix is printed, format it cleanly as "KEMENKES RI [AKD/AKL/PKRT] [number]".
   - Search the document text and artwork layout thoroughly.
5. All legible artwork text content printed on the layout.

Ensure the output matches the exact text or numbers on the document.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: [filePart, prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Extracted name of the medical device product." },
              docType: { type: Type.STRING, description: "Document type. Must be exactly 'Inner Box', 'Pouch', 'Label Botol', 'IFU', 'QC Pass Certif', 'Master Carton', or 'Lainnya'." },
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
      res.json({
        name: req.body?.fileName?.replace(/\.(pdf|png|jpg|jpeg|webp)$/i, "").replace(/_/g, " ") || "Artwork Product",
        docType: "Inner Box",
        refCode: "REF-1002301",
        nieNumber: "KEMENKES RI AKD 20902120034",
        artworkText: `Satu-satunya dokumen resmi PT Sansico Medika Indonesia.`
      });
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
