const express = require("express");
const router = express.Router();
const db = require("../database");
const { validateMatch } = require("../match-validation");
const VALID_POSITIONS = new Set(["goleiro", "defensor", "meio", "atacante", "versatil"]);
const validId = (id) => typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);

function parseJson(value) {
    if (value === null || value === undefined || typeof value === "object") return value;
    try { return JSON.parse(value); } catch { return value; }
}

function serializeMatch(row) {
    return {
        id: row.id,
        date: row.date,
        season: row.season,
        modality: row.modality || "society",
        format: row.format,
        location: row.location || "",
        teamA: row.teamA,
        teamB: row.teamB,
        teamAIds: parseJson(row.teamAIds) || [],
        teamBIds: parseJson(row.teamBIds) || [],
        stats: parseJson(row.stats) || {},
        scoreA: row.scoreA,
        scoreB: row.scoreB,
        winner: row.winner,
        mvpId: row.mvpId,
        mvpTie: parseJson(row.mvpTie)
    };
}

router.get("/backup", async (req, res) => {
    try {
        const [[stateRows], [players], [matches]] = await Promise.all([
            db.query("SELECT data FROM app_state WHERE id = 1 LIMIT 1"),
            db.query("SELECT id, name, photo, active, `position`, goalkeeper, created_at FROM players ORDER BY name"),
            db.query("SELECT * FROM matches ORDER BY date DESC")
        ]);

        const state = stateRows.length ? parseJson(stateRows[0].data) : {};
        res.json({
            ...state,
            version: 3,
            app: "golaco-score",
            exportedAt: new Date().toISOString(),
            players: players.map((p) => ({
                id: p.id, name: p.name, photo: p.photo, active: Boolean(p.active),
                position: p.position || "versatil", goalkeeper: Boolean(p.goalkeeper), createdAt: p.created_at
            })),
            matches: matches.map(serializeMatch)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/restore", async (req, res) => {
    const backup = req.body;
    if (!backup || !Array.isArray(backup.players) || !Array.isArray(backup.matches))
        return res.status(400).json({ error: "Arquivo de backup inválido." });

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("DELETE FROM matches");
        await connection.query("DELETE FROM players");

        for (const player of backup.players) {
            if (!validId(player.id) || typeof player.name !== "string" || !player.name.trim() || player.name.trim().length > 120)
                throw new Error("O backup contém um jogador inválido.");
            if (player.photo && (!/^data:image\/(jpeg|png|webp);base64,/.test(player.photo) || player.photo.length > 1500000))
                throw new Error("O backup contém uma foto inválida ou muito grande.");

            await connection.query(
                "INSERT INTO players (id, name, photo, active, `position`, goalkeeper, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [player.id, player.name.trim(), player.photo || null, player.active !== false,
                 VALID_POSITIONS.has(player.position) ? player.position : "versatil",
                 player.goalkeeper === true || player.position === "goleiro",
                 new Date(player.createdAt || player.created_at || Date.now())]
            );
        }

        for (const match of backup.matches) {
            const validationError = validateMatch(match, { requireId: true });
            if (validationError) throw new Error(`Partida inválida no backup: ${validationError}`);

            await connection.query(`
                INSERT INTO matches
                (id, date, season, modality, format, location, teamA, teamB, teamAIds, teamBIds,
                 stats, scoreA, scoreB, winner, mvpId, mvpTie)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                match.id, new Date(match.date), match.season,
                match.modality || "society", match.format,
                match.location?.trim() || null, match.teamA || "Time A", match.teamB || "Time B",
                JSON.stringify(match.teamAIds), JSON.stringify(match.teamBIds),
                JSON.stringify(match.stats), Number(match.scoreA) || 0, Number(match.scoreB) || 0,
                match.winner || "draw", match.mvpId || null,
                JSON.stringify(match.mvpTie || null)
            ]);
        }

        const { players, matches, version, app, exportedAt, ...state } = backup;
        await connection.query(`
            INSERT INTO app_state (id, data) VALUES (1, ?)
            ON DUPLICATE KEY UPDATE data = VALUES(data)
        `, [JSON.stringify(state)]);

        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(400).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.delete("/reset", async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query("DELETE FROM matches");
        await connection.query("DELETE FROM players");
        await connection.query("DELETE FROM app_state WHERE id = 1");
        await connection.commit();
        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT data FROM app_state WHERE id = 1 LIMIT 1");
        if (!rows.length) return res.json({});
        res.json(JSON.parse(rows[0].data));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

router.post("/", async (req, res) => {
    try {
        const json = JSON.stringify(req.body);
        await db.query(`
            INSERT INTO app_state(id, data) VALUES(1, ?)
            ON DUPLICATE KEY UPDATE data = VALUES(data)
        `, [json]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
