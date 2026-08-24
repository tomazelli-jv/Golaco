const VALID_FORMATS = {
  futebol: new Set(["7x7", "8x8", "9x9", "10x10", "11x11"]),
  futsal: new Set(["4x4", "5x5", "6x6"]),
  society: new Set(["5x5", "6x6", "7x7", "8x8", "9x9"])
};

const STAT_FIELDS = ["goals", "assists", "yellowCards", "redCards"];

function isId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateMatch(match, { requireId = false } = {}) {
  if (!match || typeof match !== "object" || Array.isArray(match))
    return "A partida deve ser um objeto.";
  if (requireId && !isId(match.id)) return "ID da partida inválido.";

  const date = new Date(match.date);
  if (!match.date || Number.isNaN(date.getTime())) return "Data da partida inválida.";
  if (!Number.isInteger(match.season) || match.season < 1900 || match.season > 2200)
    return "Temporada inválida.";

  const formats = VALID_FORMATS[match.modality];
  if (!formats) return "Modalidade inválida.";
  if (!formats.has(match.format)) return "Formato incompatível com a modalidade.";
  if (match.location !== null && match.location !== undefined &&
      (typeof match.location !== "string" || match.location.trim().length > 160))
    return "O local da partida deve ter até 160 caracteres.";

  if (typeof match.teamA !== "string" || !match.teamA.trim() || match.teamA.trim().length > 120 ||
      typeof match.teamB !== "string" || !match.teamB.trim() || match.teamB.trim().length > 120)
    return "Os nomes dos times são obrigatórios e devem ter até 120 caracteres.";

  if (!Array.isArray(match.teamAIds) || !Array.isArray(match.teamBIds))
    return "As escalações dos times são inválidas.";
  const expectedSize = Number(match.format.split("x")[0]);
  if (match.teamAIds.length !== expectedSize || match.teamBIds.length !== expectedSize)
    return `O formato ${match.format} exige ${expectedSize} jogadores em cada time.`;

  const roster = [...match.teamAIds, ...match.teamBIds];
  if (!roster.every(isId)) return "A escalação contém um ID de jogador inválido.";
  if (new Set(roster).size !== roster.length)
    return "Um jogador não pode aparecer mais de uma vez na partida.";

  if (!match.stats || typeof match.stats !== "object" || Array.isArray(match.stats))
    return "As estatísticas da partida são inválidas.";
  const statIds = Object.keys(match.stats);
  if (statIds.length !== roster.length || statIds.some((id) => !roster.includes(id)))
    return "As estatísticas devem conter exatamente os jogadores escalados.";
  for (const id of roster) {
    const stat = match.stats[id];
    if (!stat || typeof stat !== "object" || Array.isArray(stat) ||
        STAT_FIELDS.some((field) => !isNonNegativeInteger(stat[field])))
      return "Gols, assistências e cartões devem ser números inteiros não negativos.";
  }

  if (match.events !== undefined && match.events !== null) {
    const validEventTypes = new Set(["goal", "assist", "yellow", "red"]);
    if (!Array.isArray(match.events)) return "O histórico de eventos é inválido.";
    for (const event of match.events) {
      if (!event || typeof event !== "object" || !isId(event.id) ||
          !validEventTypes.has(event.type) || !roster.includes(event.playerId) ||
          !["A", "B"].includes(event.team) || !isNonNegativeInteger(event.at))
        return "O histórico contém um evento inválido.";
    }
  }
  if (match.durationSeconds !== undefined && !isNonNegativeInteger(match.durationSeconds))
    return "A duração da partida é inválida.";

  if (!isNonNegativeInteger(match.scoreA) || !isNonNegativeInteger(match.scoreB))
    return "O placar deve usar números inteiros não negativos.";
  const expectedWinner = match.scoreA === match.scoreB ? "draw" : match.scoreA > match.scoreB ? "A" : "B";
  if (match.winner !== expectedWinner) return "O vencedor informado não corresponde ao placar.";

  if (match.mvpId !== null && match.mvpId !== undefined && !roster.includes(match.mvpId))
    return "O MVP deve ser um jogador escalado.";
  if (match.mvpTie !== null && match.mvpTie !== undefined) {
    if (!Array.isArray(match.mvpTie) || match.mvpTie.length < 2 ||
        new Set(match.mvpTie).size !== match.mvpTie.length ||
        match.mvpTie.some((id) => !roster.includes(id)))
      return "A lista de empate do MVP é inválida.";
  }
  if (match.mvpId && Array.isArray(match.mvpTie))
    return "Informe um MVP único ou um empate, não os dois.";

  return null;
}

module.exports = { validateMatch };
