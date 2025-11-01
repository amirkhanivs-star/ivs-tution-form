import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import fetch from "node-fetch"; // ✅ Used to send data to n8n webhook
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ✅ Serve your static frontend (public folder)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Root route — main HTML فائل لوڈ کرے گا
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
/* ------------------ MAIN FORM SUBMISSION API ------------------ */
app.post("/api/forms", async (req, res) => {
  try {
    const payload = req.body;

    // ✅ Validate required fields
    if (!payload?.studentName || !payload?.signatureDataUrl) {
      return res
        .status(400)
        .json({ error: "studentName and signature are required" });
    }

    // ✅ Send data to n8n webhook
    try {
      const webhookUrl =
        "https://amirkhanivs.app.n8n.cloud/webhook-test/8cd28224-d123-4c6e-a4aa-17ceba3f141f";

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: payload.studentName,
          grade: payload.grade,
          dob: payload.dob,
          guardianWhatsapp: payload.guardianWhatsapp,
          email: payload.email,
          regDate: payload.regDate,
          signatureDataUrl: payload.signatureDataUrl,
        }),
      });

      console.log("✅ Data successfully sent to n8n webhook");
    } catch (err) {
      console.error("⚠️ Webhook send failed:", err.message);
    }

    // ✅ Respond back to frontend
    res.json({ ok: true, message: "Form received and sent to webhook." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "failed_to_send_webhook" });
  }
});

/* ------------------ SERVER STARTUP ------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at: http://localhost:${PORT}`)
);

