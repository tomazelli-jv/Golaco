const crypto = require("crypto");

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createToken(username) {
  const payload = encode({ sub: username, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
  return `${payload}.${sign(payload, process.env.AUTH_SECRET)}`;
}

function verifyToken(token) {
  if (typeof token !== "string") return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra || !safeEqual(signature, sign(payload, process.env.AUTH_SECRET))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data.sub || !Number.isInteger(data.exp) || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function credentialsAreValid(username, password) {
  return safeEqual(username, process.env.ADMIN_USER) && safeEqual(password, process.env.ADMIN_PASSWORD);
}

function requireAuth(req, res, next) {
  const header = req.get("authorization") || "";
  const data = verifyToken(header.startsWith("Bearer ") ? header.slice(7) : "");
  if (!data) return res.status(401).json({ error: "Autenticação necessária." });
  req.auth = data;
  next();
}

function validateAuthConfig() {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8)
    throw new Error("Defina ADMIN_USER e ADMIN_PASSWORD (mínimo de 8 caracteres) no arquivo .env.");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)
    throw new Error("Defina AUTH_SECRET com pelo menos 32 caracteres no arquivo .env.");
}

module.exports = { createToken, verifyToken, credentialsAreValid, requireAuth, validateAuthConfig };
