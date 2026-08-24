const express = require("express");
const router = express.Router();
const db = require("../database");
const VALID_POSITIONS = new Set(["goleiro", "defensor", "meio", "atacante", "versatil"]);
const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);

function validPhoto(photo) {
  return photo === null || photo === undefined ||
    (typeof photo === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(photo) && photo.length <= 1500000);
}

router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, name, photo, active, \`position\`, goalkeeper, created_at AS createdAt FROM players ORDER BY name`);
    res.json(rows.map((player) => ({
      ...player, active: Boolean(player.active), goalkeeper: Boolean(player.goalkeeper)
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { id, name, photo, createdAt } = req.body;
    const cleanName = typeof name === "string" ? name.trim() : "";
    const position = VALID_POSITIONS.has(req.body.position) ? req.body.position : "versatil";
    const goalkeeper = req.body.goalkeeper === true || position === "goleiro";
    if (!validPhoto(photo)) return res.status(400).json({ error: "Foto inválida ou muito grande." });
    if (!validId(id) || !cleanName || cleanName.length > 120)
      return res.status(400).json({ error: "ID ou nome do jogador inválido." });
    await db.query(
      `INSERT INTO players (id, name, photo, active, \`position\`, goalkeeper, created_at) VALUES (?, ?, ?, TRUE, ?, ?, ?)`,
      [id, cleanName, photo || null, position, goalkeeper, createdAt ? new Date(createdAt) : new Date()]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const position = VALID_POSITIONS.has(req.body.position) ? req.body.position : "versatil";
    const goalkeeper = req.body.goalkeeper === true || position === "goleiro";
    if (!validPhoto(req.body.photo)) return res.status(400).json({ error: "Foto inválida ou muito grande." });
    if (!validId(req.params.id) || !name || name.length > 120)
      return res.status(400).json({ error: "ID ou nome do jogador inválido." });
    const [result] = await db.query(
      `UPDATE players SET name = ?, photo = ?, \`position\` = ?, goalkeeper = ? WHERE id = ?`,
      [name, req.body.photo || null, position, goalkeeper, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: "Jogador não encontrado." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ error: "ID do jogador inválido." });
    const [result] = await db.query("UPDATE players SET active = FALSE WHERE id = ? AND active = TRUE", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Jogador não encontrado." });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
