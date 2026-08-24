const express = require("express");
const router = express.Router();
const db = require("../database");
const { validateMatch } = require("../match-validation");

function parseJson(value) {
    if (value === null || value === undefined || typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return value; }
}

function normalizeRows(rows) {
    rows.forEach((row) => {
        row.modality = row.modality || "society";
        row.teamAIds = parseJson(row.teamAIds) || [];
        row.teamBIds = parseJson(row.teamBIds) || [];
        row.stats = parseJson(row.stats) || {};
        row.events = parseJson(row.events) || [];
        row.durationSeconds = Number(row.durationSeconds) || 0;
        row.mvpTie = parseJson(row.mvpTie);
    });
    return rows;
}

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM matches ORDER BY date DESC");
        res.json(normalizeRows(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const m = req.body;
        const validationError = validateMatch(m, { requireId: true });
        if (validationError) return res.status(400).json({ error: validationError });

        await db.query(`
            INSERT INTO matches
            (id, date, season, modality, format, location, teamA, teamB, teamAIds, teamBIds,
             stats, events, durationSeconds, scoreA, scoreB, winner, mvpId, mvpTie)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            m.id, new Date(m.date), m.season, m.modality, m.format,
            m.location?.trim() || null, m.teamA, m.teamB,
            JSON.stringify(m.teamAIds), JSON.stringify(m.teamBIds), JSON.stringify(m.stats),
            JSON.stringify(m.events || []), Number(m.durationSeconds) || 0,
            Number(m.scoreA) || 0, Number(m.scoreB) || 0, m.winner || "draw",
            m.mvpId || null, JSON.stringify(m.mvpTie || null)
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const m = req.body;
        const validationError = validateMatch(m);
        if (validationError) return res.status(400).json({ error: validationError });

        const [result] = await db.query(`
            UPDATE matches
            SET date=?, season=?, modality=?, format=?, location=?, teamA=?, teamB=?, teamAIds=?, teamBIds=?,
                stats=?, events=?, durationSeconds=?, scoreA=?, scoreB=?, winner=?, mvpId=?, mvpTie=?
            WHERE id=?
        `, [
            new Date(m.date), m.season, m.modality, m.format, m.location?.trim() || null, m.teamA, m.teamB,
            JSON.stringify(m.teamAIds), JSON.stringify(m.teamBIds), JSON.stringify(m.stats),
            JSON.stringify(m.events || []), Number(m.durationSeconds) || 0,
            Number(m.scoreA) || 0, Number(m.scoreB) || 0, m.winner || "draw",
            m.mvpId || null, JSON.stringify(m.mvpTie || null), req.params.id
        ]);

        if (!result.affectedRows)
            return res.status(404).json({ error: "Partida não encontrada." });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.query("DELETE FROM matches WHERE id=?", [req.params.id]);
        if (!result.affectedRows)
            return res.status(404).json({ error: "Partida não encontrada." });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
