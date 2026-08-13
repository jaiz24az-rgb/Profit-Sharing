import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  const PORT = 3000;

  // Initialize Gemini AI Client lazily
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    return new GoogleGenAI({ apiKey });
  };

  // API Routes
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server-side AI Audit & Report Generation
  app.post("/api/ai-analyze", async (req, res) => {
    try {
      const { records, promptType, customInstruction } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(200).json({
          analysis: "Kunci API Gemini tidak dikonfigurasi. Berikut ringkasan otomatis standar:\n\nSystem telah mendeteksi " +
            (records?.length || 0) + " data penagihan. Untuk analisis kecerdasan AI mendalam, silakan masukkan GEMINI_API_KEY di menu Secrets."
        });
      }

      let systemPrompt = `Anda adalah Asisten Pakar Keuangan & Revenue Accounting Penerbangan untuk PT Sriwijaya Air dan PT NAM Air.
Tugas Anda adalah menganalisis data checklist penagihan ke vendor (PT 21 Express, PT Gatrans Mulia Indonesia, PT Mitra Kargo Nusantara) dan memberikan rekomendasi, draf email laporan HO, atau analisis risiko kelambatan pembayaran.`;

      let userPrompt = "";
      if (promptType === "HO_REPORT") {
        userPrompt = `Buatkan Draf Laporan Resmi Eksekutif untuk Head Office (HO) Keuangan & Direksi berdasarkan data transaksi berikut:
${JSON.stringify(records, null, 2)}

Format laporan harus mencakup:
1. Ringkasan Total Tagihan & Status Realisasi Pembayaran per Maskapai (Sriwijaya Air & NAM Air) & Vendor.
2. Daftar invoice yang tertahan di tahap IRF, Invoice, atau Faktur.
3. Rekomendasi tindakan prioritas minggu ini.
Sampaikan dengan bahasa profesional, lugas, dan terstruktur.`;
      } else if (promptType === "AUDIT_RISK") {
        userPrompt = `Lakukan audit risiko dan deteksi bottleneck pada data checklist penagihan berikut:
${JSON.stringify(records, null, 2)}

Harap identifikasi:
1. Transaksi mana yang berpotensi mengalami keterlambatan (stagnan di tahap IRF HO atau Email Vendor).
2. Ketidaksesuaian tanggal email antar tahap.
3. Saran perbaikan alur penagihan.`;
      } else {
        userPrompt = `${customInstruction || "Berikan ringkasan analisis untuk data berikut"}:\n${JSON.stringify(records, null, 2)}`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }
        ]
      });

      return res.json({ analysis: response.text });
    } catch (error: any) {
      console.error("Gemini AI API Error:", error);
      return res.status(500).json({ error: error?.message || "Gagal menghasilkan analisis AI" });
    }
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server checklist penagihan running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
