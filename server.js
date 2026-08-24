require("dotenv").config({ quiet: true });

const express = require("express");
const path = require("path");
const cors = require("cors");
const { requireAuth, validateAuthConfig } = require("./auth");

const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
const allowedOrigins = String(process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
if (allowedOrigins.length) app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => res.json({ status: "ok", uptime: Math.floor(process.uptime()) }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api", requireAuth);
app.use("/api/db", require("./routes/db"));
app.use("/api/players", require("./routes/players"));
app.use("/api/matches", require("./routes/matches"));
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
  etag: true
}));

app.get("/api", (req, res) => res.json({ status: true, message: "BRICKSCORE Football API Online" }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 3000;
let httpServer;
async function start() {
  try {
    validateAuthConfig();
    await require("./database").initialize();
    httpServer = app.listen(PORT, "0.0.0.0", () => console.log(`Servidor iniciado na porta ${PORT}`));
  } catch (err) {
    console.error("Falha ao preparar o banco de dados:", err);
    process.exitCode = 1;
  }
}

start();

async function shutdown(signal) {
  console.log(`${signal} recebido. Encerrando servidor.`);
  if (httpServer) await new Promise((resolve) => httpServer.close(resolve));
  await require("./database").end();
  process.exit(0);
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
