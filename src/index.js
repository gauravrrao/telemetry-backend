import express from "express";
import ingestRouter from "./routes/ingest.js";
import summaryRouter from "./routes/summary.js";

const app = express();
app.use(express.json({ limit: "5mb" }));

app.use("/api/v1/telemetry", ingestRouter);
app.use("/api/v1/telemetry", summaryRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`listening on :${PORT}`));