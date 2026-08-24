require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");
const { requireAuth, validateAuthConfig } = require("./auth");

const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
const allowedOrigins = String(process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
if (allowedOrigins.length) app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api", requireAuth);
app.use("/api/db", require("./routes/db"));
app.use("/api/players", require("./routes/players"));
app.use("/api/matches", require("./routes/matches"));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api", (req, res) => res.json({ status: true, message: "BRICKSCORE Football API Online" }));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

const PORT = process.env.PORT || 3000;
async function start() {
  try {
    validateAuthConfig();
    await require("./database").initialize();
    app.listen(PORT, () => console.log(`Servidor iniciado na porta ${PORT}`));
  } catch (err) {
    console.error("Falha ao preparar o banco de dados:", err);
    process.exitCode = 1;
  }
}

start();
