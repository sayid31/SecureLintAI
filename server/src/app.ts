import cors from "cors";
import express from "express";
import auditRoutes from "./routes/audit.routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  })
);
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "securelint-ai" });
});

app.use("/api", auditRoutes);

// 404 + error handlers
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use(
  (
    err: Error & { statusCode?: number; status?: number; expose?: boolean },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    // body-parser/Zod errors carry statusCode (e.g. malformed JSON = 400);
    // only real failures fall back to 500.
    const status = err.statusCode ?? err.status ?? 500;
    console.error(`[error ${status}]`, err);
    res
      .status(status)
      .json({ error: status >= 500 ? "Internal server error" : err.message });
  }
);

export default app;
