const express = require("express");
const { createToken, verifyToken, credentialsAreValid } = require("../auth");

const router = express.Router();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function attemptState(ip) {
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt <= now) {
    const fresh = { count: 0, resetAt: now + WINDOW_MS };
    attempts.set(ip, fresh);
    return fresh;
  }
  return current;
}

router.post("/login", (req, res) => {
  const state = attemptState(req.ip);
  if (state.count >= MAX_ATTEMPTS)
    return res.status(429).json({ error: "Muitas tentativas. Aguarde 15 minutos." });

  const username = typeof req.body.username === "string" ? req.body.username : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";
  if (!credentialsAreValid(username, password)) {
    state.count += 1;
    return res.status(401).json({ error: "Usuário ou senha inválidos." });
  }

  attempts.delete(req.ip);
  res.json({ token: createToken(username), expiresIn: 12 * 60 * 60, username });
});

router.get("/me", (req, res) => {
  const header = req.get("authorization") || "";
  const data = verifyToken(header.startsWith("Bearer ") ? header.slice(7) : "");
  if (!data) return res.status(401).json({ error: "Sessão inválida ou expirada." });
  res.json({ username: data.sub, expiresAt: data.exp });
});

module.exports = router;
